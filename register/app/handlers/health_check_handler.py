import json
from typing import Dict, Any
from .base_handler import BaseHandler


class HealthCheckHandler(BaseHandler):
    """Handler for health check requests"""
    
    @staticmethod
    def handle(context: Any = None) -> Dict[str, Any]:
        """
        Handle health check requests.
        
        Args:
            context: Lambda context (optional)
            
        Returns:
            Lambda response dictionary
        """
        timestamp = context.get_remaining_time_in_millis() if context else 0
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Lambda is ready",
                "timestamp": timestamp
            })
        }