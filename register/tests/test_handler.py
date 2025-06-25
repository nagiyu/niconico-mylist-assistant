import json
import handler

def make_event(url=None):
    if url is not None:
        body = json.dumps({"url": url})
    else:
        body = None
    return {"body": body}

def test_lambda_handler_success():
    test_url = "https://github.com/nagiyu/niconico-mylist-assistant"
    event = make_event(test_url)
    response = handler.lambda_handler(event, None)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "s3_url" in body

def test_lambda_handler_missing_url():
    event = {"body": json.dumps({})}
    response = handler.lambda_handler(event, None)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "error" in body

def test_lambda_handler_no_body():
    event = {}
    response = handler.lambda_handler(event, None)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "error" in body
