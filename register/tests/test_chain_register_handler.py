import pytest
import json
import os
import base64
from unittest.mock import patch, MagicMock, Mock
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.handlers.chain_register_handler import ChainRegisterHandler


def encrypt_password(password, secret_key):
    """Helper function to encrypt password for testing"""
    aesgcm = AESGCM(secret_key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, password.encode("utf-8"), None)
    encrypted = nonce + ct
    return base64.b64encode(encrypted).decode("utf-8")


class TestChainRegisterHandler:
    
    def test_handle_first_request_success(self):
        """Test successful first request in chain - should return immediately and chain to delete/create"""
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create, \
             patch('app.regist.regist') as mock_regist, \
             patch('app.services.auth_service.AuthService.decrypt_password') as mock_decrypt, \
             patch.object(ChainRegisterHandler, '_invoke_delete_and_create_chain') as mock_delete_chain:
            
            # Setup mocks
            mock_regist.return_value = []  # No failed IDs
            mock_decrypt.return_value = "password"  # Mock decryption
            
            # Test data
            email = "test@example.com"
            secret_key = os.urandom(32)
            encrypted_password = encrypt_password("password", secret_key)
            id_list = ["video1", "video2", "video3"]
            
            # Call handler
            result = ChainRegisterHandler.handle(
                email, encrypted_password, id_list, None, "Test Title", 
                None, None, True
            )
            
            # Verify decryption was called
            mock_decrypt.assert_called_once_with(encrypted_password)
            
            # Verify delete/create was NOT called directly (it's chained now)
            mock_delete_create.assert_not_called()
            mock_regist.assert_not_called()  # No immediate registration processing
            
            # Verify delete and create chain was invoked
            mock_delete_chain.assert_called_once_with(
                email, encrypted_password, id_list, None, "Test Title"
            )
            
            # Verify response indicates immediate return
            assert result["statusCode"] == 200
            response_data = json.loads(result["body"])
            assert response_data["message"] == "Registration process started"
            assert response_data["user_message"] == "登録処理を開始しました。完了時に通知をお送りします。"
            assert response_data["total_videos"] == 3
    
    def test_handle_delete_and_create_request(self):
        """Test delete and create request - should perform delete/create and start video registration"""
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create, \
             patch('app.regist.regist') as mock_regist, \
             patch('app.services.auth_service.AuthService.decrypt_password') as mock_decrypt, \
             patch.object(ChainRegisterHandler, '_invoke_next_chain') as mock_chain:
            
            # Setup mocks
            mock_regist.return_value = []  # No failed IDs
            mock_decrypt.return_value = "password"  # Mock decryption
            
            # Test data
            email = "test@example.com"
            secret_key = os.urandom(32)
            encrypted_password = encrypt_password("password", secret_key)
            id_list = ["video1", "video2", "video3"]
            
            # Call handler with delete and create request
            result = ChainRegisterHandler.handle(
                email, encrypted_password, id_list, None, "Test Title", 
                None, None, False, True  # is_first_request=False, is_delete_and_create_request=True
            )
            
            # Verify decryption was called
            mock_decrypt.assert_called_once_with(encrypted_password)
            
            # Verify delete and create was called
            mock_delete_create.assert_called_once_with(email, "password", "Test Title")
            
            # Verify video registration was called
            mock_regist.assert_called_once_with(email, "password", id_list)
            
            # Verify no chaining needed for small list
            mock_chain.assert_not_called()
            
            # Verify response
            assert result["statusCode"] == 200
            response_data = json.loads(result["body"])
            assert response_data["message"] == "Chain registration step completed"
            assert response_data["is_complete"] is True
    
    def test_handle_large_list_triggers_chain(self):
        """Test that large list triggers chaining with delete and create request"""
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create, \
             patch('app.regist.regist') as mock_regist, \
             patch('app.services.auth_service.AuthService.decrypt_password') as mock_decrypt, \
             patch.object(ChainRegisterHandler, '_invoke_next_chain') as mock_chain:
            
            # Setup mocks
            mock_regist.return_value = []  # No failed IDs
            mock_decrypt.return_value = "password"  # Mock decryption
            
            # Test data - large list that will trigger chaining
            email = "test@example.com"
            secret_key = os.urandom(32)
            encrypted_password = encrypt_password("password", secret_key)
            id_list = [f"video{i}" for i in range(35)]  # 35 videos > 30 batch size
            
            # Call handler with delete and create request (simulating second step)
            result = ChainRegisterHandler.handle(
                email, encrypted_password, id_list, None, "Test Title", 
                None, None, False, True  # is_first_request=False, is_delete_and_create_request=True
            )
            
            # Verify decryption was called
            mock_decrypt.assert_called_once_with(encrypted_password)
            
            # Verify delete and create was called
            mock_delete_create.assert_called_once_with(email, "password", "Test Title")
            
            # Verify video registration was called with first batch
            mock_regist.assert_called_once()
            processed_batch = mock_regist.call_args[0][2]
            assert len(processed_batch) == 30
            
            # Verify chaining was triggered for remaining videos
            mock_chain.assert_called_once()
            chain_args = mock_chain.call_args[0]
            assert chain_args[1] == encrypted_password  # Second argument should be encrypted password
            
            # Verify response
            assert result["statusCode"] == 200
            response_data = json.loads(result["body"])
            assert response_data["is_complete"] is False
            assert response_data["remaining_count"] == 5
    
    def test_handle_chain_request(self):
        """Test handling of subsequent chain request"""
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create, \
             patch('app.regist.regist') as mock_regist, \
             patch('app.services.auth_service.AuthService.decrypt_password') as mock_decrypt:
            
            # Setup mocks
            mock_regist.return_value = ["failed1"]  # One failed ID
            mock_decrypt.return_value = "password"  # Mock decryption
            
            # Test data for chain request
            email = "test@example.com"
            secret_key = os.urandom(32)
            encrypted_password = encrypt_password("password", secret_key)
            remaining_ids = ["video31", "video32"]
            failed_ids = ["prev_failed"]
            
            # Call handler as chain request
            result = ChainRegisterHandler.handle(
                email, encrypted_password, None, None, "",
                remaining_ids, failed_ids, False
            )
            
            # Verify decryption was called
            mock_decrypt.assert_called_once_with(encrypted_password)
            
            # Verify delete_and_create was NOT called for chain request
            mock_delete_create.assert_not_called()
            
            # Verify regist was called with remaining IDs
            mock_regist.assert_called_once_with(email, "password", remaining_ids)
            
            # Verify response
            assert result["statusCode"] == 200
            response_data = json.loads(result["body"])
            assert response_data["is_complete"] is True
            assert response_data["failed_count"] == 2  # prev_failed + failed1
    
    def test_handle_exception(self):
        """Test error handling"""
        with patch('app.services.auth_service.AuthService.decrypt_password') as mock_decrypt:
            mock_decrypt.side_effect = Exception("Decryption failed")
            
            secret_key = os.urandom(32)
            encrypted_password = encrypt_password("password", secret_key)
            
            result = ChainRegisterHandler.handle(
                "test@example.com", encrypted_password, ["video1"], 
                None, "", None, None, True
            )
            
            assert result["statusCode"] == 500
            response_data = json.loads(result["body"])
            assert "Decryption failed" in response_data["error"]
    
    def test_invoke_delete_and_create_chain_success(self):
        """Test successful invocation of delete and create chain (fire-and-forget)"""
        with patch('requests.post') as mock_post, \
             patch.dict(os.environ, {'REGISTER_LAMBDA_ENDPOINT': 'https://test.lambda.endpoint'}):
            
            # Test data
            email = "test@example.com"
            encrypted_password = "encrypted_password"
            id_list = ["video1", "video2"]
            subscription_json = "subscription_data"
            title = "Test Title"
            
            # Call the method
            ChainRegisterHandler._invoke_delete_and_create_chain(
                email, encrypted_password, id_list, subscription_json, title
            )
            
            # Verify the request was made with correct payload
            mock_post.assert_called_once()
            args, kwargs = mock_post.call_args
            
            assert args[0] == 'https://test.lambda.endpoint'
            assert kwargs['headers'] == {"Content-Type": "application/json"}
            assert kwargs['timeout'] == 5  # Updated to 5 for fire-and-forget
            
            payload = kwargs['json']
            assert payload['action'] == 'chain_register'
            assert payload['email'] == email
            assert payload['password'] == encrypted_password
            assert payload['id_list'] == id_list
            assert payload['subscription'] == subscription_json
            assert payload['title'] == title
            assert payload['is_first_request'] is False
            assert payload['is_delete_and_create_request'] is True