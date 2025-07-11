import os
import uuid
import boto3
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement

def create_chrome_driver() -> WebDriver:
    options = webdriver.ChromeOptions()

    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument('--no-zygote')
    
    # Performance optimizations - disable unnecessary features (keeping only stable options)
    options.add_argument("--disable-images")
    options.add_argument("--disable-plugins")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-features=TranslateUI")
    options.add_argument("--disable-audio-output")
    options.add_argument("--disable-default-apps")
    
    # Set preferences to disable media and other unnecessary content
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values.notifications": 2,
        "profile.default_content_settings.popups": 0,
        "profile.default_content_setting_values.media_stream": 2,
        "profile.default_content_setting_values.geolocation": 2,
        "profile.default_content_setting_values.plugins": 2,
        "profile.managed_default_content_settings.media_stream": 2
    }
    options.add_experimental_option("prefs", prefs)

    options.add_argument(f"--user-data-dir=/tmp/chrome_profile_{os.getpid()}_{uuid.uuid4()}")

    driver = webdriver.Chrome(options=options)
    
    # Set conservative timeouts to prevent connection issues
    driver.set_page_load_timeout(120)  # 2 minutes for page loading
    driver.implicitly_wait(10)  # 10 seconds for element finding
    
    return driver


def wait_and_click(driver: WebDriver, xpath: str, timeout: int = 10) -> None:
    """
    Wait until the element specified by xpath is visible, then click it.
    """
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_element("xpath", xpath).is_displayed()
    )
    driver.find_element("xpath", xpath).click()


def wait_and_click_in_element(element: WebElement, xpath: str, timeout: int = 10) -> None:
    """
    指定したelementの下でxpathの要素が表示されるまで待ち、クリックする。
    """
    WebDriverWait(element, timeout).until(
        lambda e: e.find_element("xpath", xpath).is_displayed()
    )
    element.find_element("xpath", xpath).click()


def wait_and_send_keys(driver: WebDriver, xpath: str, keys: str, timeout: int = 10) -> None:
    """
    Wait until the element specified by xpath is visible, then send keys to it.
    """
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_element("xpath", xpath).is_displayed()
    )
    driver.find_element("xpath", xpath).clear()
    driver.find_element("xpath", xpath).send_keys(keys)


def wait_and_accept_alert(driver: WebDriver, timeout: int = 10) -> None:
    """
    Wait until a JavaScript alert/confirm dialog is present, then accept (OK) it.
    """
    WebDriverWait(driver, timeout).until(lambda d: d.switch_to.alert)
    alert = driver.switch_to.alert
    alert.accept()


def save_screenshot_to_s3(driver: WebDriver) -> str:
    """
    Takes a screenshot using the given Selenium driver and uploads it to S3.
    Returns the S3 key of the uploaded screenshot.
    """
    screenshot_bytes = driver.get_screenshot_as_png()
    s3 = boto3.client("s3")
    bucket = os.environ["S3_BUCKET_NAME"]
    key = f"screenshots/{uuid.uuid4().hex}.png"
    s3.put_object(Bucket=bucket, Key=key, Body=screenshot_bytes, ContentType="image/png")

    # Build S3 URL (assuming public-read or appropriate permissions)
    region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    s3_url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"

    return s3_url


def wait_and_find_element(driver: WebDriver, xpath: str, timeout: int = 10) -> WebElement:
    """
    指定したxpathの要素が表示されるまで待ち、その要素を返す。
    """
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_element("xpath", xpath).is_displayed()
    )
    return driver.find_element("xpath", xpath)


def wait_and_find_element_in_element(element: WebElement, xpath: str, timeout: int = 10) -> WebElement:
    """
    指定したelementの下でxpathの要素が表示されるまで待ち、その要素を返す。
    """
    WebDriverWait(element, timeout).until(
        lambda e: e.find_element("xpath", xpath).is_displayed()
    )
    return element.find_element("xpath", xpath)
