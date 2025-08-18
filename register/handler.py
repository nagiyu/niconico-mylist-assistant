import json
from app.services.auth_service import AuthService
from app.handlers.health_check_handler import HealthCheckHandler
from app.handlers.delete_and_create_handler import DeleteAndCreateHandler
from app.handlers.register_handler import RegisterHandler
from app.handlers.chain_register_handler import ChainRegisterHandler

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
        
        # Chain register specific fields
        remaining_ids = data.get("remaining_ids")
        failed_ids = data.get("failed_ids", [])
        is_first_request = data.get("is_first_request", True)
    else:
        email = None
        encrypted_password = None
        id_list = None
        subscription_json = None
        title = None
        action = None
        uuid = None
        chunk_index = None
        remaining_ids = None
        failed_ids = []
        is_first_request = True

    # For chain_register, we need either id_list (first request) or remaining_ids (chain request)
    if action == "chain_register":
        if not email or not encrypted_password:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'email' or 'password' in request body"})
            }
        if not id_list and not remaining_ids:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'id_list' or 'remaining_ids' in request body"})
            }
    elif not email or not encrypted_password or not id_list:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing 'email', 'password', or 'id_list' in request body"})
        }

    # Decrypt password only for non-chain actions
    if action != "chain_register":
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
    elif action == "chain_register":
        # For chain_register, pass encrypted password to avoid re-encryption in chains
        return ChainRegisterHandler.handle(
            email, encrypted_password, id_list, subscription_json, title,
            remaining_ids, failed_ids, is_first_request
        )
    else:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Unknown action: {action}"})
        }
