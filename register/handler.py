import json
import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app import regist

def lambda_handler(event, context):
    # Parse URL from event body (assume JSON)
    body = event.get("body")
    if body:
        data = json.loads(body)
        email = data.get("email")
        encrypted_password = data.get("password")
        id_list = data.get("id_list")
    else:
        email = None
        encrypted_password = None
        id_list = None

    if not email or not encrypted_password or not id_list:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing 'email', 'password', or 'id_list' in request body"})
        }

    # 復号処理
    try:
        # クライアントと共有するシークレットキー（32バイトのbase64文字列を想定）
        SHARED_SECRET = base64.b64decode(os.environ["SHARED_SECRET_KEY"])
        # パスワードは base64( nonce + ciphertext + tag ) で送られてくる想定
        encrypted_bytes = base64.b64decode(encrypted_password)
        nonce = encrypted_bytes[:12]
        ct_and_tag = encrypted_bytes[12:]
        aesgcm = AESGCM(SHARED_SECRET)
        password = aesgcm.decrypt(nonce, ct_and_tag, None).decode("utf-8")
    except Exception as e:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Failed to decrypt password", "detail": str(e)})
        }

    failed_id_list = regist.regist(email, password, id_list)

    return {
        "statusCode": 200,
        "body": json.dumps({"failed_id_list": failed_id_list})
    }
