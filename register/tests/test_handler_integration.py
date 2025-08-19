import json
import pytest
from unittest.mock import patch
from handler import lambda_handler


class TestLambdaHandler:
    
    def test_chain_register_action(self):
        """Test that chain_register action is properly routed"""
        event = {
            "body": json.dumps({
                "action": "chain_register",
                "email": "test@example.com",
                "password": "encrypted_password",
                "id_list": ["video1", "video2"],
                "subscription": None,
                "title": "Test Title",
                "is_first_request": True
            })
        }
        
        with patch('app.handlers.chain_register_handler.ChainRegisterHandler.handle') as mock_handle:
            
            mock_handle.return_value = {
                "statusCode": 200,
                "body": json.dumps({"message": "success", "is_complete": True})
            }
            
            result = lambda_handler(event, {})
            
            # Verify chain handler was called with encrypted password (new behavior)
            mock_handle.assert_called_once_with(
                "test@example.com", "encrypted_password", ["video1", "video2"],
                None, "Test Title", None, [], True, False
            )
            
            # Verify response
            assert result["statusCode"] == 200
    
    def test_chain_register_missing_parameters(self):
        """Test chain_register with missing parameters"""
        event = {
            "body": json.dumps({
                "action": "chain_register",
                "email": "test@example.com"
                # Missing password and id_list/remaining_ids
            })
        }
        
        result = lambda_handler(event, {})
        
        assert result["statusCode"] == 400
        response_data = json.loads(result["body"])
        assert "Missing" in response_data["error"]
    
    def test_chain_register_with_remaining_ids(self):
        """Test chain_register with remaining_ids (chain request)"""
        event = {
            "body": json.dumps({
                "action": "chain_register",
                "email": "test@example.com",
                "password": "encrypted_password",
                "remaining_ids": ["video31", "video32"],
                "failed_ids": ["failed1"],
                "is_first_request": False
            })
        }
        
        with patch('app.handlers.chain_register_handler.ChainRegisterHandler.handle') as mock_handle:
            
            mock_handle.return_value = {
                "statusCode": 200,
                "body": json.dumps({"message": "success", "is_complete": True})
            }
            
            result = lambda_handler(event, {})
            
            # Verify chain handler was called with encrypted password (new behavior)
            mock_handle.assert_called_once_with(
                "test@example.com", "encrypted_password", None,
                None, "", ["video31", "video32"], ["failed1"], False, False
            )
            
            assert result["statusCode"] == 200