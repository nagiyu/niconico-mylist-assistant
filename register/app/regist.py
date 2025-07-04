import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from app.helpers import selenium_helper

# 定数
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
VIDEO_MENU_PARENT_XPATH = '//*[@id="root"]/div[1]/main/div[2]/section/div[1]/div/div[2]/div[3]/div'
VIDEO_MENU_BUTTON_XPATH = './/button[@aria-label="メニュー"]'
VIDEO_ADD_TO_MYLIST_XPATH = '//button[text()="マイリストに追加"]'
VIDEO_MYLIST_SELECT_XPATH = '//*[@id="root"]/div[1]/main/div[2]/section/div[3]/div[2]/section/div/ul/li[2]/button'
MAX_THREADS = 3

def login(driver, email, password):
    driver.get(NICO_URL)
    selenium_helper.wait_and_click(driver, LOGIN_BUTTON_XPATH)
    selenium_helper.wait_and_send_keys(driver, MAIL_INPUT_XPATH, email)
    selenium_helper.wait_and_send_keys(driver, PASS_INPUT_XPATH, password)
    selenium_helper.wait_and_click(driver, LOGIN_SUBMIT_XPATH)

def remove_all_mylist(driver):
    driver.get(MYLIST_URL)
    while True:
        count_element = driver.find_element("xpath", MYLIST_COUNT_XPATH)
        count_text = count_element.text
        if count_text == "0":
            break
        selenium_helper.wait_and_click(driver, MYLIST_REMOVE1_XPATH)
        selenium_helper.wait_and_click(driver, MYLIST_REMOVE2_XPATH)
        selenium_helper.wait_and_click(driver, MYLIST_REMOVE3_XPATH)
        selenium_helper.wait_and_accept_alert(driver)
        time.sleep(1)
        driver.get(MYLIST_URL)

def create_mylist(driver, title: str = None):
    selenium_helper.wait_and_click(driver, MYLIST_CREATE_BUTTON_XPATH)
    if title is None or title == "":
        current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
        title = f"MyList_{current_time}"
    selenium_helper.wait_and_send_keys(driver, MYLIST_TITLE_INPUT_XPATH, title)
    selenium_helper.wait_and_click(driver, MYLIST_CREATE_CONFIRM_XPATH)
    time.sleep(1)
    return title

def add_videos_to_mylist(driver, id_list):
    failed_id_list = []
    for video_id in id_list:
        try:
            driver.get(f"{NICO_URL}/watch/{video_id}")
            element = selenium_helper.wait_and_find_element(driver, VIDEO_MENU_PARENT_XPATH)
            selenium_helper.wait_and_click_in_element(element, VIDEO_MENU_BUTTON_XPATH)
            selenium_helper.wait_and_click(driver, VIDEO_ADD_TO_MYLIST_XPATH)
            selenium_helper.wait_and_click(driver, VIDEO_MYLIST_SELECT_XPATH)
            time.sleep(1)
        except Exception:
            selenium_helper.save_screenshot_to_s3(driver)
            failed_id_list.append(video_id)
            pass
    return failed_id_list


def distribute_id_list(id_list, n):
    """指定された数のスレッドにIDリストを分割する"""
    chunks = [[] for _ in range(n)]

    for i, item in enumerate(id_list):
        chunks[i % n].append(item)

    return chunks


def process_regist(email, password, id_list):
    driver = selenium_helper.create_chrome_driver()
    driver.set_window_size(1366, 768)  # Optimized smaller window size for headless mode
    login(driver, email, password)
    failed_id_list = add_videos_to_mylist(driver, id_list)
    driver.quit()
    return failed_id_list



def regist(email, password, id_list, title: str = None):
    driver = selenium_helper.create_chrome_driver()
    driver.set_window_size(1366, 768)  # Optimized smaller window size for headless mode
    login(driver, email, password)
    remove_all_mylist(driver)
    create_mylist(driver, title)
    driver.quit()

    threads = min(MAX_THREADS, len(id_list))
    id_chunks = distribute_id_list(id_list, threads)

    with ThreadPoolExecutor(max_workers=threads) as executor:
        # Submit all tasks first, then collect results
        futures = []
        for chunk in id_chunks:
            future = executor.submit(process_regist, email, password, chunk)
            futures.append(future)
        
        # Collect results from all futures
        failed_id_lists = []
        for future in futures:
            failed_id_lists.append(future.result())

    # 1つのリストにまとめる
    failed_id_list = []

    for sublist in failed_id_lists:
        for video_id in sublist:
            failed_id_list.append(video_id)

    return failed_id_list

