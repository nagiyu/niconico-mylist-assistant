import os
import pytest

from utils.notification_util import NotificationUtil


def test_send_push_notification_success():
    subscription = os.getenv("PUSH_SUBSCRIPTION")
    failed_id_list = []

    NotificationUtil.send_push_notification(subscription, failed_id_list)
