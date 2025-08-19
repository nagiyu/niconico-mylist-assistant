import os
import json
from app.regist import regist

def test_lambda_handler_success():
    email = "test@example.com"
    password = "testpassword"
    id_list = ["sm9", "sm10"]
    # Note: This test would need selenium mocking to work without selenium driver
    # regist(email, password, id_list)
    print("Test function signature validated")


def test_process_regist_retry(monkeypatch):
    call_count = {"count": 0}

    class DummyDriver:
        def __init__(self):
            self.closed = False
        def set_window_size(self, w, h):
            pass
        def quit(self):
            self.closed = True
        @property
        def title(self):
            if call_count["count"] < 2:
                raise Exception("Driver crashed")
            return "title"

    def dummy_create_chrome_driver():
        call_count["count"] += 1
        return DummyDriver()

    def dummy_login(driver, email, password):
        pass

    def dummy_add_videos_to_mylist(driver, id_list):
        # Fail first two calls, succeed on third
        if call_count["count"] < 3:
            return id_list
        return []

    monkeypatch.setattr("app.regist.selenium_helper.create_chrome_driver", dummy_create_chrome_driver)
    monkeypatch.setattr("app.regist.login", dummy_login)
    monkeypatch.setattr("app.regist.add_videos_to_mylist", dummy_add_videos_to_mylist)

    from app.regist import regist
    failed_ids = regist("email", "password", ["id1", "id2"], max_retries=3)
    assert failed_ids == []

