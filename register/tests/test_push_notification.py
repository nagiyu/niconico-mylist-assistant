import json
import unittest.mock as mock
from handler import send_push_notification


def test_send_push_notification_with_subscription():
    """Test that push notification is sent when subscription is provided"""
    
    # Mock subscription
    mock_subscription = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test",
        "keys": {
            "p256dh": "test_key",
            "auth": "test_auth"
        }
    }
    
    failed_id_list = []  # No failed items
    
    # Mock the requests.post call
    with mock.patch('handler.requests.post') as mock_post:
        with mock.patch.dict('os.environ', {'NOTIFICATION_API_ENDPOINT': 'http://test.com/api/send-notification'}):
            mock_response = mock.Mock()
            mock_response.status_code = 200
            mock_post.return_value = mock_response
            
            # Should not raise exception
            send_push_notification(json.dumps(mock_subscription), failed_id_list)
            
            # Verify the API was called
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            
            # Check the request payload
            assert call_args[1]['json']['subscription'] == mock_subscription
            assert call_args[1]['json']['message'] == "すべての動画の登録が完了しました！"


def test_send_push_notification_with_failures():
    """Test push notification message when there are failures"""
    
    mock_subscription = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test",
        "keys": {
            "p256dh": "test_key",
            "auth": "test_auth"
        }
    }
    
    failed_id_list = ["sm1", "sm2", "sm3"]  # 3 failed items
    
    with mock.patch('handler.requests.post') as mock_post:
        with mock.patch.dict('os.environ', {'NOTIFICATION_API_ENDPOINT': 'http://test.com/api/send-notification'}):
            mock_response = mock.Mock()
            mock_response.status_code = 200
            mock_post.return_value = mock_response
            
            send_push_notification(json.dumps(mock_subscription), failed_id_list)
            
            # Check the message includes failure count
            call_args = mock_post.call_args
            assert "3件の動画で登録に失敗しました" in call_args[1]['json']['message']


def test_send_push_notification_no_endpoint():
    """Test that function handles missing endpoint gracefully"""
    
    mock_subscription = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test",
        "keys": {
            "p256dh": "test_key",
            "auth": "test_auth"
        }
    }
    
    failed_id_list = []
    
    # No NOTIFICATION_API_ENDPOINT set - should not raise exception
    with mock.patch.dict('os.environ', {}, clear=True):
        send_push_notification(json.dumps(mock_subscription), failed_id_list)
        # Should complete without error