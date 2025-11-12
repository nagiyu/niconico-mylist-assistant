import time
from datetime import datetime
from typing import List, Optional

from helpers import selenium_helper

NICO_URL = "https://www.nicovideo.jp"
MYLIST_URL = "https://www.nicovideo.jp/my/mylist"
LOGIN_BUTTON_XPATH = '//*[@id="CommonHeader"]/div/div/div/div[2]/a'
MAIL_INPUT_XPATH = '//*[@id="input__mailtel"]'
PASS_INPUT_XPATH = '//*[@id="input__password"]'
LOGIN_SUBMIT_XPATH = '//*[@id="login__submit"]'
MYLIST_COUNT_XPATH = '//*[@id="UserPage-app"]/section/section/main/div/div/div[1]/div[2]/div/div/div/ul[1]/div/header/div/span/span[1]'
MYLIST_REMOVE1_XPATH = '//*[@id="UserPage-app"]/section/section/main/div/section/div/div[3]/div[1]/div/a'
MYLIST_REMOVE2_XPATH = '//*[@id="UserPage-app"]/section/section/main/div/section/div/header/div/div[2]/button'
MYLIST_REMOVE3_XPATH = '//*[@id="UserPage-app"]/section/section/main/div/section/div/header/div/div[2]/div/button[3]'
MYLIST_CREATE_BUTTON_XPATH = '//*[@id="UserPage-app"]/section/section/main/div/div/div[1]/div[2]/div/div/div/ul[1]/div/div/button[1]'
MYLIST_TITLE_INPUT_XPATH = '//*[@id="undefined-title"]'
MYLIST_CREATE_CONFIRM_XPATH = '/html/body/div[13]/div/div/article/footer/button'
VIDEO_MENU_BUTTON_XPATH = '/html/body/div/div[1]/main/div[2]/div[1]/section/div[1]/div/div[2]/div[3]/div/button[5]'
VIDEO_ADD_TO_MYLIST_XPATH = '/html/body/div[2]/div/div/div[2]/button'
VIDEO_MYLIST_SELECT_XPATH = '//*[@id="root"]/div[1]/main/div[2]/div[1]/section/div[3]/div[2]/section/div/ul/li[2]/button'


class RegisterService:
    """
    Nicovideo のマイリスト登録処理をまとめたサービスクラス。
    デフォルトでは project 内の helpers.selenium_helper を使用するが、
    テスト時などは selenium_helper_module を差し替えて利用可能。
    """

    def __init__(self, selenium_helper_module=selenium_helper, window_size: tuple = (1920, 1080)):
        self.selenium: selenium_helper = selenium_helper_module
        self.window_size = window_size
        # create the webdriver immediately in constructor
        self.driver = self.selenium.create_chrome_driver()
        self.driver.set_window_size(*self.window_size)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            finally:
                self.driver = None

    def __del__(self):
        if getattr(self, "driver", None):
            try:
                self.driver.quit()
            except Exception:
                pass

    def login(self, email: str, password: str) -> None:
        """
        サイトへ遷移してログインする。
        """
        driver = self.driver
        driver.get(NICO_URL)
        self.selenium.wait_and_click(driver, LOGIN_BUTTON_XPATH)
        self.selenium.wait_and_send_keys(driver, MAIL_INPUT_XPATH, email)
        self.selenium.wait_and_send_keys(driver, PASS_INPUT_XPATH, password)
        self.selenium.wait_and_click(driver, LOGIN_SUBMIT_XPATH)

    def remove_all_mylist(self) -> None:
        """
        全てのマイリストを削除する（UI 操作）。
        """
        driver = self.driver
        driver.get(MYLIST_URL)
        while True:
            count_element = self.selenium.wait_and_find_element(driver, MYLIST_COUNT_XPATH, timeout=30)
            count_text = count_element.text
            if count_text == "0":
                break
            self.selenium.wait_and_click(driver, MYLIST_REMOVE1_XPATH)
            self.selenium.wait_and_click(driver, MYLIST_REMOVE2_XPATH)
            self.selenium.wait_and_click(driver, MYLIST_REMOVE3_XPATH)
            self.selenium.wait_and_accept_alert(driver)
            time.sleep(1)
            driver.get(MYLIST_URL)

    def create_mylist(self, title: Optional[str] = None) -> str:
        """
        新規マイリストを作成して、そのタイトルを返す。
        """
        driver = self.driver
        self.selenium.wait_and_click(driver, MYLIST_CREATE_BUTTON_XPATH)
        if title is None or title == "":
            current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
            title = f"MyList_{current_time}"
        self.selenium.wait_and_send_keys(
            driver, MYLIST_TITLE_INPUT_XPATH, title)
        self.selenium.wait_and_click(driver, MYLIST_CREATE_CONFIRM_XPATH)
        time.sleep(1)
        return title

    def add_videos_to_mylist(self, id_list: List[str]) -> List[str]:
        """
        指定した video id リストをマイリストに追加する。
        失敗した id のリストを返す。
        """
        driver = self.driver
        failed_id_list: List[str] = []
        for video_id in id_list:
            try:
                driver.get(f"{NICO_URL}/watch/{video_id}")
                self.selenium.wait_and_click(driver, VIDEO_MENU_BUTTON_XPATH)
                self.selenium.wait_and_click(driver, VIDEO_ADD_TO_MYLIST_XPATH)
                self.selenium.wait_and_click(driver, VIDEO_MYLIST_SELECT_XPATH)
                time.sleep(1)
            except Exception as exeption:
                # self.selenium.save_screenshot_to_s3(driver)  # 必要なら有効化
                # driver が死んでいる場合は外側へ例外を投げる
                try:
                    _ = driver.title
                except Exception:
                    raise
                print("Exception:", exeption)
                failed_id_list.append(video_id)
        return failed_id_list

    def save_screenshot(self) -> str | None:
        """
        Takes a screenshot using the current Selenium driver and uploads it to S3.
        Returns the S3 key of the uploaded screenshot, or None if failed.
        """
        return self.selenium.save_screenshot_to_s3(self.driver)

    def regist(self, email: str, password: str, id_list: List[str], max_retries: int = 3) -> List[str]:
        """
        マイリストへ動画を登録する。selenium の失敗に対して再試行を行う。
        成功しなかった video id のリストを返す。
        """
        last_failed_list = id_list

        for attempt in range(max_retries):
            driver = self.driver
            try:
                # ensure driver exists (constructor creates it, but recreate if cleared)
                if driver is None:
                    self.driver = self.selenium.create_chrome_driver()
                    self.driver.set_window_size(*self.window_size)
                    driver = self.driver

                self.login(email, password)
                failed_id_list = self.add_videos_to_mylist(id_list)

                # いずれか成功していれば結果を返す
                if len(failed_id_list) < len(id_list) or attempt == max_retries - 1:
                    return failed_id_list

                # 全て失敗しており、再試行する場合は last_failed_list を更新
                last_failed_list = failed_id_list

            except Exception as e:
                # ドライバを破棄して次のループで再作成する
                if driver:
                    try:
                        driver.quit()
                    except Exception:
                        pass
                    finally:
                        self.driver = None

                # 最終試行なら例外を再送出
                if attempt == max_retries - 1:
                    raise e

        return last_failed_list

    def delete_and_create_mylist(self, email: str, password: str, title: Optional[str] = None) -> None:
        """
        既存のマイリストを全削除して新規作成するユーティリティ。
        """
        try:
            self.login(email, password)
            self.remove_all_mylist()
            self.create_mylist(title)
        finally:
            if getattr(self, "driver", None):
                try:
                    self.driver.quit()
                except Exception:
                    pass
                finally:
                    self.driver = None
