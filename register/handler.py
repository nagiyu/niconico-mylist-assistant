import json
from app.services.auth_service import AuthService
from app.handlers.health_check_handler import HealthCheckHandler
from app.handlers.delete_and_create_handler import DeleteAndCreateHandler
from app.handlers.register_handler import RegisterHandler

def lambda_handler(event, context):
    # Parse URL from event body (assume JSON)
    body = event.get("body")
    if body:
        data = json.loads(body)
        
        # Check if this is a health check request
        if data.get("health_check"):
            return HealthCheckHandler.handle(context)
        
        email = data.get("email")
        encrypted_password = data.get("password")
        id_list = data.get("id_list")
        subscription_json = data.get("subscription")
        title = data.get("title", "")
        action = data.get("action")  # New field to distinguish delete or register
        uuid = data.get("uuid", "")
        chunk_index = data.get("chunk_index", "")
    else:
        email = None
        encrypted_password = None
        id_list = None
        subscription_json = None
        title = None
        action = None
        uuid = None
        chunk_index = None

    if not email or not encrypted_password or not id_list:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing 'email', 'password', or 'id_list' in request body"})
        }

    # Decrypt password
    try:
        password = AuthService.decrypt_password(encrypted_password)
    except Exception as e:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Failed to decrypt password", "detail": str(e)})
        }

    # Dispatch to appropriate handler based on action
    if action == "delete_and_create":
        return DeleteAndCreateHandler.handle(email, password, title)
    elif action == "register":
        return RegisterHandler.handle(email, password, id_list, subscription_json, uuid, chunk_index)
    else:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Unknown action: {action}"})
        }
