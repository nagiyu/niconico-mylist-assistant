import json
import os
import requests


class NotificationUtil:
    """Service for handling push notifications"""

    @staticmethod
    def send_push_notification(subscription_json: str, failed_id_list: list) -> None:
        """
        Send push notification with registration results.

        Args:
            subscription_json: JSON string containing push subscription info
            failed_id_list: List of video IDs that failed to register

        Raises:
            Exception: If notification sending fails
        """
        try:
            subscription = json.loads(subscription_json)

            # Create result message
            total_count = len(failed_id_list)
            if total_count == 0:
                message = "すべての動画の登録が完了しました！"
            else:
                message = f"登録処理が完了しました。{total_count}件の動画で登録に失敗しました。"

            # Send notification via Next.js API
            api_endpoint = os.environ.get("NOTIFICATION_API_ENDPOINT")
            if not api_endpoint:
                print(
                    "NOTIFICATION_API_ENDPOINT not configured, skipping push notification")
                return

            response = requests.post(
                api_endpoint,
                json={
                    "message": message,
                    "subscription": subscription
                },
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            if response.status_code == 200:
                print("Push notification sent successfully")
            else:
                print(
                    f"Failed to send push notification: {response.status_code} - {response.text}")

        except Exception as e:
            print(f"Error in send_push_notification: {e}")
            raise
