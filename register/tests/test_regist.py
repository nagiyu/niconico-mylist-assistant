import os
import json
from app.regist import regist

def test_lambda_handler_success():
    email = os.environ["MYLIST_EMAIL"]
    password = os.environ["MYLIST_PASSWORD"]
    id_list = json.loads(os.environ["MYLIST_ID_LIST"])
    regist(email, password, id_list)
