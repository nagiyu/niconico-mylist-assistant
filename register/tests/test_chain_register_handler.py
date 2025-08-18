import pytest
import json
from unittest.mock import patch, MagicMock
from app.handlers.chain_register_handler import ChainRegisterHandler


class TestChainRegisterHandler:
    
    def test_handle_first_request_success(self):
        """Test successful first request in chain"""
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create, \
             patch('app.regist.regist') as mock_regist, \
             patch.object(ChainRegisterHandler, '_invoke_next_chain') as mock_chain:
            
            # Setup mocks
            mock_regist.return_value = []  # No failed IDs
            
            # Test data
            email = "test@example.com"
            password = "password"
            id_list = ["video1", "video2", "video3"]
            
            # Call handler
            result = ChainRegisterHandler.handle(
                email, password, id_list, None, "Test Title", 
                None, None, True
            )
            
            # Verify calls
            mock_delete_create.assert_called_once_with(email, password, "Test Title")
            mock_regist.assert_called_once_with(email, password, id_list)
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
             patch.object(ChainRegisterHandler, '_invoke_next_chain') as mock_chain:
            
            # Setup mocks
            mock_regist.return_value = []  # No failed IDs
            
            # Test data - large list that will trigger chaining
            email = "test@example.com"
            password = "password"
            id_list = [f"video{i}" for i in range(35)]  # 35 videos > 30 batch size
            
            # Call handler
            result = ChainRegisterHandler.handle(
                email, password, id_list, None, "Test Title", 
                None, None, True
            )
            
            # Verify calls
            mock_delete_create.assert_called_once_with(email, password, "Test Title")
            mock_regist.assert_called_once()
            
            # Check that first 30 were processed
            processed_batch = mock_regist.call_args[0][2]
            assert len(processed_batch) == 30
            
            # Verify chaining was triggered
            mock_chain.assert_called_once()
            
            # Verify response
            assert result["statusCode"] == 200
            response_data = json.loads(result["body"])
            assert response_data["is_complete"] is False
            assert response_data["remaining_count"] == 5
    
    def test_handle_chain_request(self):
        """Test handling of subsequent chain request"""
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create, \
             patch('app.regist.regist') as mock_regist:
            
            # Setup mocks
            mock_regist.return_value = ["failed1"]  # One failed ID
            
            # Test data for chain request
            email = "test@example.com"
            password = "password"
            remaining_ids = ["video31", "video32"]
            failed_ids = ["prev_failed"]
            
            # Call handler as chain request
            result = ChainRegisterHandler.handle(
                email, password, None, None, "",
                remaining_ids, failed_ids, False
            )
            
            # Verify delete_and_create was NOT called for chain request
            mock_delete_create.assert_not_called()
            
            # Verify regist was called with remaining IDs
            mock_regist.assert_called_once_with(email, password, remaining_ids)
            
            # Verify response
            assert result["statusCode"] == 200
            response_data = json.loads(result["body"])
            assert response_data["is_complete"] is True
            assert response_data["failed_count"] == 2  # prev_failed + failed1
    
    def test_handle_exception(self):
        """Test error handling"""
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create:
            mock_delete_create.side_effect = Exception("Test error")
            
            result = ChainRegisterHandler.handle(
                "test@example.com", "password", ["video1"], 
                None, "", None, None, True
            )
            
            assert result["statusCode"] == 500
            response_data = json.loads(result["body"])
            assert "Test error" in response_data["error"]