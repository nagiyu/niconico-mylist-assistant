import pytest
import json
import os
import base64
from unittest.mock import patch, MagicMock
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
        """Test successful first request in chain"""
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
            
            # Call handler
            result = ChainRegisterHandler.handle(
                email, encrypted_password, id_list, None, "Test Title", 
                None, None, True
            )
            
            # Verify decryption was called
            mock_decrypt.assert_called_once_with(encrypted_password)
            
            # Verify calls with decrypted password
            mock_delete_create.assert_called_once_with(email, "password", "Test Title")
            mock_regist.assert_called_once_with(email, "password", id_list)
            mock_chain.assert_not_called()  # No chaining needed for small list
            
            # Verify response
            assert result["statusCode"] == 200
            response_data = json.loads(result["body"])
            assert response_data["message"] == "Chain registration step completed"
            assert response_data["is_complete"] is True
    
    def test_handle_large_list_triggers_chain(self):
        """Test that large list triggers chaining"""
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
            
            # Call handler
            result = ChainRegisterHandler.handle(
                email, encrypted_password, id_list, None, "Test Title", 
                None, None, True
            )
            
            # Verify decryption was called
            mock_decrypt.assert_called_once_with(encrypted_password)
            
            # Verify calls
            mock_delete_create.assert_called_once_with(email, "password", "Test Title")
            mock_regist.assert_called_once()
            
            # Check that first 30 were processed
            processed_batch = mock_regist.call_args[0][2]
            assert len(processed_batch) == 30
            
            # Verify chaining was triggered with encrypted password
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