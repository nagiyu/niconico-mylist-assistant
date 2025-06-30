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

def test_lambda_handler_missing_params():
    event = make_event()
    response = handler.lambda_handler(event, None)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "Missing" in body["error"]

def test_lambda_handler_health_check():
    event = {"body": json.dumps({"health_check": True})}
    response = handler.lambda_handler(event, None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["message"] == "Lambda is ready"
