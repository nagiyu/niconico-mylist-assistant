import sys
import json
from app.screenshot_to_s3 import save_url_screenshot_to_s3

def lambda_handler(event, context):
    # Parse URL from event body (assume JSON)
    body = event.get("body")
    if body:
        data = json.loads(body)
        url = data.get("url")
    else:
        url = None

    if not url:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing 'url' in request body"})
        }

    s3_url = save_url_screenshot_to_s3(url)

    return {
        "statusCode": 200,
        "body": json.dumps({"s3_url": s3_url})
    }
