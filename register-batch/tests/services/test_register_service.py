import os
import pytest
from services.register_service import RegisterService


def test_regist_success():
    email = os.getenv("NICONICO_EMAIL")
    password = os.getenv("NICONICO_PASSWORD")
    id_list = os.getenv("NICONICO_ID_LIST", "").split(",")

    with RegisterService() as service:
        service.login(email, password)
        service.remove_all_mylist()
        service.create_mylist()
        failed_ids = service.add_videos_to_mylist(id_list)
        print(f"Failed IDs: {failed_ids}")
