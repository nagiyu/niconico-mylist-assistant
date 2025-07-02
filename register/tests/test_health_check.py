import json
import handler

def test_health_check():
    """Test the health check endpoint"""
    event = {
        "body": json.dumps({"health_check": True})
    }
    
    response = handler.lambda_handler(event, None)
    
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["message"] == "Lambda is ready"
    assert "timestamp" in body

def test_health_check_with_context():
    """Test the health check endpoint with context"""
    
    class MockContext:
        def get_remaining_time_in_millis(self):
            return 15000
    
    event = {
        "body": json.dumps({"health_check": True})
    }
    
    response = handler.lambda_handler(event, MockContext())
    
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["message"] == "Lambda is ready"
    assert body["timestamp"] == 15000