import json
from typing import Dict, Any


class BaseHandler:
    """Base class for all action handlers with common functionality"""
    
    @staticmethod
    def create_success_response(message: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Create a successful response.
        
        Args:
            message: Success message
            data: Optional additional data to include
            
        Returns:
            Lambda response dictionary
        """
        response_body = {"message": message}
        if data:
            response_body.update(data)
            
        return {
            "statusCode": 200,
            "body": json.dumps(response_body)
        }
    
    @staticmethod
    def create_error_response(status_code: int, error_message: str, detail: str = None) -> Dict[str, Any]:
        """
        Create an error response.
        
        Args:
            status_code: HTTP status code
            error_message: Error message
            detail: Optional detailed error information
            
        Returns:
            Lambda response dictionary
        """
        error_body = {"error": error_message}
        if detail:
            error_body["detail"] = detail
            
        return {
            "statusCode": status_code,
            "body": json.dumps(error_body)
        }
    
    @staticmethod
    def create_bad_request_response(error_message: str, detail: str = None) -> Dict[str, Any]:
        """Create a 400 Bad Request response"""
        return BaseHandler.create_error_response(400, error_message, detail)
    
    @staticmethod
    def create_server_error_response(error_message: str) -> Dict[str, Any]:
        """Create a 500 Internal Server Error response"""
        return BaseHandler.create_error_response(500, error_message)