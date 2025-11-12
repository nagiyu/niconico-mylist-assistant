import os
from services.register_service import RegisterService
from utils.notification_util import NotificationUtil


def main():
    print("Starting batch registration process...")

    email = os.getenv("NICONICO_EMAIL")
    password = os.getenv("NICONICO_PASSWORD")
    id_list = os.getenv("NICONICO_ID_LIST", "").split(",")
    push_subscription = os.getenv("PUSH_SUBSCRIPTION")

    with RegisterService() as service:
        try:
            print("Logging in...")
            service.login(email, password)
            print("Removing all mylist items...")
            service.remove_all_mylist()
            print("Creating new mylist...")
            service.create_mylist()
            print("Adding videos to mylist...")
            failed_ids = service.add_videos_to_mylist(id_list)
        except Exception as e:
            print("An error occurred:", e)
            screenshot_key = service.save_screenshot()
            if screenshot_key:
                print(f"Screenshot saved to S3 with key: {screenshot_key}")
            raise

    print("Batch registration process completed.")

    print("Sending push notification...")
    NotificationUtil.send_push_notification(push_subscription, failed_ids)

    print("Push notification sent.")

if __name__ == "__main__":
    main()
