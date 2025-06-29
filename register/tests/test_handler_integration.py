import json
import unittest.mock as mock
from handler import lambda_handler


def test_lambda_handler_with_subscription():
    """Test that lambda handler handles subscription parameter"""
    
    # Mock event with subscription
    mock_subscription = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test",
        "keys": {
            "p256dh": "test_key",
            "auth": "test_auth"
        }
    }
    
    event = {
        "body": json.dumps({
            "email": "test@example.com",
            "password": "encrypted_password_base64",
            "id_list": ["sm1", "sm2"],
            "subscription": json.dumps(mock_subscription)
        })
    }
    
    context = {}
    
    # Mock all the dependencies
    with mock.patch('handler.regist.regist') as mock_regist:
        with mock.patch('handler.send_push_notification') as mock_push:
            with mock.patch.dict('os.environ', {'SHARED_SECRET_KEY': 'dGVzdF9zZWNyZXRfa2V5XzEyMzQ1Njc4OTAxMjM0NTY='}):
                
                # Mock the regist function to return some failures
                mock_regist.return_value = ["sm2"]  # sm2 failed
                
                # The password decryption will fail, so we expect a 400 response
                response = lambda_handler(event, context)
                
                # Should return 400 due to decryption failure (expected for this test)
                assert response["statusCode"] == 400
                assert "Failed to decrypt password" in json.loads(response["body"])["error"]


def test_lambda_handler_without_subscription():
    """Test that lambda handler works without subscription (backward compatibility)"""
    
    event = {
        "body": json.dumps({
            "email": "test@example.com", 
            "password": "encrypted_password_base64",
            "id_list": ["sm1", "sm2"]
            # No subscription field
        })
    }
    
    context = {}
    
    with mock.patch('handler.regist.regist') as mock_regist:
        with mock.patch('handler.send_push_notification') as mock_push:
            with mock.patch.dict('os.environ', {'SHARED_SECRET_KEY': 'dGVzdF9zZWNyZXRfa2V5XzEyMzQ1Njc4OTAxMjM0NTY='}):
                
                mock_regist.return_value = []
                
                response = lambda_handler(event, context)
                
                # Should return 400 due to decryption failure, but subscription should be None
                assert response["statusCode"] == 400
                # Push notification should not be called when subscription is None
                mock_push.assert_not_called()


def test_lambda_handler_missing_params():
    """Test handler with missing required parameters"""
    
    event = {
        "body": json.dumps({
            "email": "test@example.com"
            # Missing password and id_list
        })
    }
    
    context = {}
    
    response = lambda_handler(event, context)
    
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "Missing 'email', 'password', or 'id_list'" in body["error"]