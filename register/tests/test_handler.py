from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import os
import json
import handler

def make_event(email=None, password=None, id_list=None):
    if email is not None and password is not None and id_list is not None:
        body = json.dumps({"email": email, "password": password, "id_list": id_list})
    else:
        body = None
    return {"body": body}

def encrypt_password(password, secret_key):
    aesgcm = AESGCM(secret_key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, password.encode("utf-8"), None)
    encrypted = nonce + ct
    return base64.b64encode(encrypted).decode("utf-8")

def test_lambda_handler_success():
    email = os.environ["MYLIST_EMAIL"]
    password = os.environ["MYLIST_PASSWORD"]
    id_list = json.loads(os.environ["MYLIST_ID_LIST"])
    secret_key = base64.b64decode(os.environ["SHARED_SECRET_KEY"])
    encrypted_password = encrypt_password(password, secret_key)
    event = make_event(email, encrypted_password, id_list)
    response = handler.lambda_handler(event, None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "failed_id_list" in body
