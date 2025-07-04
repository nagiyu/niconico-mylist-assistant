import os
import json
from app.regist import regist

def test_lambda_handler_success():
    email = "test@example.com"
    password = "testpassword"
    id_list = ["sm9", "sm10"]
    title = "Test MyList Title"
    regist(email, password, id_list, title)
