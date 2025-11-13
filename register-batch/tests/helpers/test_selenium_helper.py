import pytest
from helpers import selenium_helper


def test_create_chrome_driver():
    driver = selenium_helper.create_chrome_driver()

    assert driver is not None

    driver.quit()
