from typing import Dict, Any
from .base_handler import BaseHandler
from app import regist


class DeleteAndCreateHandler(BaseHandler):
    """Handler for delete and create mylist operations"""
    
    @staticmethod
    def handle(email: str, password: str, title: str = "") -> Dict[str, Any]:
        """
        Handle delete and create mylist requests.
        
        Args:
            email: User email
            password: Decrypted password
            title: Optional title for the new mylist
            
        Returns:
            Lambda response dictionary
        """
        try:
            regist.delete_and_create_mylist(email, password, title)
            return DeleteAndCreateHandler.create_success_response(
                "Mylist deleted and created successfully"
            )
        except Exception as e:
            return DeleteAndCreateHandler.create_server_error_response(str(e))