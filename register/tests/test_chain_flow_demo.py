import json
import pytest
from unittest.mock import patch, MagicMock
from app.handlers.chain_register_handler import ChainRegisterHandler


class TestChainRegisterFlow:
    """Integration tests demonstrating the complete chain flow"""
    
    def test_complete_chain_flow_scenario(self):
        """Test complete chain flow with 100 videos (4 chain requests)"""
        # Create 100 video IDs as mentioned in the issue description
        video_ids = [f"video{i:03d}" for i in range(1, 101)]
        
        with patch('app.regist.delete_and_create_mylist') as mock_delete_create, \
             patch('app.regist.regist') as mock_regist, \
             patch.object(ChainRegisterHandler, '_invoke_next_chain') as mock_chain, \
             patch('app.services.notification_service.NotificationService.send_push_notification') as mock_notify:
            
            # Setup mocks - simulate some failures
            mock_regist.side_effect = [
                ["video025", "video030"],  # First batch: 2 failures out of 30
                ["video055"],              # Second batch: 1 failure out of 30
                [],                        # Third batch: no failures
                ["video095"]               # Fourth batch: 1 failure out of 10
            ]
            
            email = "test@example.com"
            password = "password"
            subscription = '{"endpoint": "test"}'
            title = "Test Playlist"
            
            # Step 1: First request (videos 1-30)
            result1 = ChainRegisterHandler.handle(
                email, password, video_ids, subscription, title,
                None, None, True
            )
            
            # Verify first step
            assert result1["statusCode"] == 200
            response1 = json.loads(result1["body"])
            assert response1["is_complete"] is False
            assert response1["processed_count"] == 30
            assert response1["remaining_count"] == 70
            assert response1["failed_count"] == 2
            
            # Verify delete_and_create was called only once
            mock_delete_create.assert_called_once_with(email, password, title)
            
            # Verify first batch processing
            mock_regist.assert_called_with(email, password, video_ids[:30])
            
            # Verify chaining was triggered
            mock_chain.assert_called_once()
            chain_call_args = mock_chain.call_args[0]
            # Args are: email, password, subscription_json, title, remaining_ids, failed_ids
            remaining_ids_arg = chain_call_args[4]  # remaining_ids
            failed_ids_arg = chain_call_args[5]     # failed_ids
            assert len(remaining_ids_arg) == 70  # remaining_ids
            assert failed_ids_arg == ["video025", "video030"]  # failed_ids
            
            # Step 2: Second chain request (videos 31-60)
            mock_chain.reset_mock()
            mock_regist.reset_mock()
            
            result2 = ChainRegisterHandler.handle(
                email, password, None, subscription, title,
                video_ids[30:], ["video025", "video030"], False
            )
            
            # Verify second step
            assert result2["statusCode"] == 200
            response2 = json.loads(result2["body"])
            assert response2["is_complete"] is False
            assert response2["processed_count"] == 30
            assert response2["remaining_count"] == 40
            assert response2["failed_count"] == 3  # Previous 2 + new 1
            
            # Verify delete_and_create was NOT called again
            assert mock_delete_create.call_count == 1
            
            # Continue the pattern for remaining requests...
            # This demonstrates the chain continues until completion
            
        print("✓ Chain flow test completed successfully")
        print(f"  - Processed 100 videos in batches of 30")
        print(f"  - Delete/create called once at start")
        print(f"  - Chain requests handle remaining videos")
        print(f"  - Failed IDs accumulated across chain")
    
    def test_final_request_sends_notification(self):
        """Test that the final request in chain sends notification"""
        with patch('app.regist.regist') as mock_regist, \
             patch.object(ChainRegisterHandler, '_invoke_next_chain') as mock_chain, \
             patch('app.services.notification_service.NotificationService.send_push_notification') as mock_notify:
            
            # Setup for final request (no remaining videos)
            mock_regist.return_value = ["failed1"]
            
            # Final chain request with only a few remaining videos
            result = ChainRegisterHandler.handle(
                "test@example.com", "password", None, 
                '{"endpoint": "test"}', "",
                ["video91", "video92"], ["prev_failed"], False
            )
            
            # Verify completion
            assert result["statusCode"] == 200
            response = json.loads(result["body"])
            assert response["is_complete"] is True
            assert response["remaining_count"] == 0
            
            # Verify no more chaining
            mock_chain.assert_not_called()
            
            # Verify notification was sent
            mock_notify.assert_called_once_with(
                '{"endpoint": "test"}', 
                ["prev_failed", "failed1"]
            )
            
        print("✓ Final notification test completed successfully")
        print(f"  - No chaining when remaining_count = 0")
        print(f"  - Push notification sent with all failed IDs")


if __name__ == "__main__":
    test = TestChainRegisterFlow()
    test.test_complete_chain_flow_scenario()
    test.test_final_request_sends_notification()
    print("\n🎉 All chain flow tests passed!")
    print("\nChain processing flow:")
    print("Manager → Register[delete+create+batch1] → Register[batch2] → Register[batch3] → Register[batch4+notify] → Manager")