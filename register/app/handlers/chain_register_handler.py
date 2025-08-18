import json
import os
import requests
from typing import Dict, Any, List
from .base_handler import BaseHandler
from app import regist
from app.services.notification_service import NotificationService


class ChainRegisterHandler(BaseHandler):
    """Handler for chain-based video registration operations"""
    
    @staticmethod
    def handle(email: str, encrypted_password: str, id_list: List[str], 
               subscription_json: str = None, title: str = "", 
               remaining_ids: List[str] = None, failed_ids: List[str] = None,
               is_first_request: bool = True, is_delete_and_create_request: bool = False) -> Dict[str, Any]:
        """
        Handle chain-based video registration requests.
        
        Args:
            email: User email
            encrypted_password: Encrypted password (will be decrypted only when needed)
            id_list: Original list of video IDs (for first request only)
            subscription_json: Push notification subscription data
            title: Title for the mylist
            remaining_ids: IDs still to be processed (for chain requests)
            failed_ids: IDs that have failed so far (for chain requests)
            is_first_request: Whether this is the first request in the chain
            is_delete_and_create_request: Whether this request should perform delete and create operations
            
        Returns:
            Lambda response dictionary
        """
        try:
            # Decrypt password only when needed for actual operations
            from app.services.auth_service import AuthService
            password = AuthService.decrypt_password(encrypted_password)
            
            # Handle first request from Manager - return immediately and chain to delete/create
            if is_first_request:
                # Chain to delete and create request immediately
                ChainRegisterHandler._invoke_delete_and_create_chain(
                    email, encrypted_password, id_list, subscription_json, title
                )
                
                # Return immediately to Manager
                return ChainRegisterHandler.create_success_response(
                    "Registration process started",
                    {
                        "user_message": "登録処理を開始しました。完了時に通知をお送りします。",
                        "total_videos": len(id_list) if id_list else 0
                    }
                )
            
            # Handle delete and create request
            if is_delete_and_create_request:
                # Step 1: Delete and create mylist
                regist.delete_and_create_mylist(email, password, title)
                
                # Initialize tracking variables for video registration
                remaining_ids = id_list.copy() if id_list else []
                failed_ids = []
            
            # Process up to 30 videos from remaining_ids
            BATCH_SIZE = 30
            current_batch = remaining_ids[:BATCH_SIZE]
            remaining_ids = remaining_ids[BATCH_SIZE:]
            
            # Register current batch
            if current_batch:
                batch_failed_ids = regist.regist(email, password, current_batch)
                failed_ids.extend(batch_failed_ids)
            
            # Check if more processing needed
            if remaining_ids:
                # Chain to next request
                ChainRegisterHandler._invoke_next_chain(
                    email, encrypted_password, subscription_json, title,
                    remaining_ids, failed_ids
                )
            else:
                # Final request - send notification
                if subscription_json:
                    try:
                        NotificationService.send_push_notification(subscription_json, failed_ids)
                    except Exception as e:
                        print(f"Failed to send push notification: {e}")
                        # Notification failure doesn't fail the entire process
            
            return ChainRegisterHandler.create_success_response(
                "Chain registration step completed",
                {
                    "processed_count": len(current_batch),
                    "remaining_count": len(remaining_ids),
                    "failed_count": len(failed_ids),
                    "is_complete": len(remaining_ids) == 0
                }
            )
            
        except Exception as e:
            return ChainRegisterHandler.create_server_error_response(str(e))
    
    @staticmethod
    def _invoke_delete_and_create_chain(email: str, encrypted_password: str, id_list: List[str],
                                       subscription_json: str, title: str) -> None:
        """
        Invoke the delete and create chain request (fire-and-forget).
        
        Args:
            email: User email
            encrypted_password: Encrypted password (passed through without re-encryption)
            id_list: List of video IDs to register
            subscription_json: Push notification subscription data
            title: Title for the mylist
        """
        try:
            # Get Lambda endpoint from environment
            lambda_endpoint = os.environ.get("REGISTER_LAMBDA_ENDPOINT")
            
            if not lambda_endpoint:
                print("Missing REGISTER_LAMBDA_ENDPOINT, cannot chain request")
                return
            
            # Invoke delete and create request
            payload = {
                "action": "chain_register",
                "email": email,
                "password": encrypted_password,
                "id_list": id_list,
                "subscription": subscription_json,
                "title": title,
                "is_first_request": False,
                "is_delete_and_create_request": True
            }
            
            # Fire-and-forget invocation
            requests.post(
                lambda_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=5  # Very short timeout for fire-and-forget
            )
            
            print(f"Invoked delete and create chain request with {len(id_list)} videos")
                
        except Exception as e:
            print(f"Failed to invoke delete and create chain request: {e}")
            # Don't raise exception - this shouldn't fail the current processing

    @staticmethod
    def _invoke_next_chain(email: str, encrypted_password: str, subscription_json: str,
                          title: str, remaining_ids: List[str], failed_ids: List[str]) -> None:
        """
        Invoke the next chain request to continue processing (fire-and-forget).
        
        Args:
            email: User email
            encrypted_password: Encrypted password (passed through without re-encryption)
            subscription_json: Push notification subscription data
            title: Title for the mylist
            remaining_ids: IDs still to be processed
            failed_ids: IDs that have failed so far
        """
        try:
            # Get Lambda endpoint from environment
            lambda_endpoint = os.environ.get("REGISTER_LAMBDA_ENDPOINT")
            
            if not lambda_endpoint:
                print("Missing REGISTER_LAMBDA_ENDPOINT, cannot chain request")
                return
            
            # Use the original encrypted password (no need to re-encrypt)
            payload = {
                "action": "chain_register",
                "email": email,
                "password": encrypted_password,
                "subscription": subscription_json,
                "title": title,
                "remaining_ids": remaining_ids,
                "failed_ids": failed_ids,
                "is_first_request": False
            }
            
            # Fire-and-forget invocation
            requests.post(
                lambda_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=5  # Very short timeout for fire-and-forget
            )
            
            print(f"Invoked next chain request with {len(remaining_ids)} remaining IDs")
                
        except Exception as e:
            print(f"Failed to invoke next chain request: {e}")
            # Don't raise exception - this shouldn't fail the current processing