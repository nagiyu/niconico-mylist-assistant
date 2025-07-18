import json
import base64
import os
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app import regist

def send_push_notification(subscription_json, failed_id_list):
    """プッシュ通知を送信する"""
    try:
        subscription = json.loads(subscription_json)
        
        # 結果メッセージを作成
        total_count = len(failed_id_list)  # 失敗した動画数を想定
        if total_count == 0:
            message = "すべての動画の登録が完了しました！"
        else:
            message = f"登録処理が完了しました。{total_count}件の動画で登録に失敗しました。"
        
        # Next.jsのAPI経由でプッシュ通知を送信
        api_endpoint = os.environ.get("NOTIFICATION_API_ENDPOINT")
        if not api_endpoint:
            print("NOTIFICATION_API_ENDPOINT not configured, skipping push notification")
            return
            
        response = requests.post(
            api_endpoint,
            json={
                "message": message,
                "subscription": subscription
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            print("Push notification sent successfully")
        else:
            print(f"Failed to send push notification: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error in send_push_notification: {e}")
        raise

def lambda_handler(event, context):
    # Parse URL from event body (assume JSON)
    body = event.get("body")
    if body:
        data = json.loads(body)
        
        # Check if this is a health check request
        if data.get("health_check"):
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Lambda is ready", "timestamp": context.get_remaining_time_in_millis() if context else 0})
            }
        
        email = data.get("email")
        encrypted_password = data.get("password")
        id_list = data.get("id_list")
        subscription_json = data.get("subscription")
        title = data.get("title", "")
        action = data.get("action")  # New field to distinguish delete or register
        uuid = data.get("uuid", "")
        chunk_index = data.get("chunk_index", "")
    else:
        email = None
        encrypted_password = None
        id_list = None
        subscription_json = None
        title = None
        action = None
        uuid = None
        chunk_index = None

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

    if action == "delete_and_create":
        # マイリスト削除処理
        try:
            regist.delete_and_create_mylist(email, password, title)

            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Mylist deleted and created successfully"})
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)})
            }

    elif action == "register":
        # マイリスト登録処理
        try:
            # 識別子ファイルパス
            tmp_file_path = f"/tmp/register-{uuid}-{chunk_index}"

            # 識別子ファイルを作成して処理中を示す
            with open(tmp_file_path, "w") as f:
                f.write("processing")

            failed_id_list = regist.regist(email, password, id_list)

            # 処理完了後、識別子ファイルを削除
            if os.path.exists(tmp_file_path):
                os.remove(tmp_file_path)

            # 全ての識別子ファイルが削除されているか確認
            tmp_dir = "/tmp"
            files = [f for f in os.listdir(tmp_dir) if f.startswith(f"register-{uuid}-")]

            if len(files) == 0:
                # 全てのチャンク処理が完了したので通知を送信
                if subscription_json:
                    try:
                        send_push_notification(subscription_json, failed_id_list)
                    except Exception as e:
                        print(f"Failed to send push notification: {e}")
                        # 通知送信失敗は処理全体を失敗させない

            return {
                "statusCode": 200,
                "body": json.dumps({"failed_id_list": failed_id_list})
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)})
            }
