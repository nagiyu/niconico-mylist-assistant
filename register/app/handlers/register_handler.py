from typing import Dict, Any, List
from .base_handler import BaseHandler
from app import regist
from app.services.file_tracking_service import FileTrackingService
from app.services.notification_service import NotificationService


class RegisterHandler(BaseHandler):
    """Handler for video registration operations"""
    
    @staticmethod
    def handle(email: str, password: str, id_list: List[str], 
               subscription_json: str = None, uuid: str = "", 
               chunk_index: str = "") -> Dict[str, Any]:
        """
        Handle video registration requests.
        
        Args:
            email: User email
            password: Decrypted password
            id_list: List of video IDs to register
            subscription_json: Push notification subscription data
            uuid: Unique identifier for batch processing
            chunk_index: Index of current chunk
            
        Returns:
            Lambda response dictionary
        """
        try:
            # Create tracking file to indicate processing is in progress
            tmp_file_path = FileTrackingService.create_tracking_file(uuid, chunk_index)
            
            # Register videos to mylist
            failed_id_list = regist.regist(email, password, id_list)
            
            # Remove tracking file when processing is complete
            FileTrackingService.remove_tracking_file(tmp_file_path)
            
            # Check if all chunks are complete and send notification if needed
            if FileTrackingService.is_all_chunks_complete(uuid):
                if subscription_json:
                    try:
                        NotificationService.send_push_notification(subscription_json, failed_id_list)
                    except Exception as e:
                        print(f"Failed to send push notification: {e}")
                        # Notification failure doesn't fail the entire process
            
            return RegisterHandler.create_success_response(
                "Registration completed",
                {"failed_id_list": failed_id_list}
            )
            
        except Exception as e:
            return RegisterHandler.create_server_error_response(str(e))