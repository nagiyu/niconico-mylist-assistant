import os
import uuid
import boto3
from app.selenium_driver import create_chrome_driver

def save_url_screenshot_to_s3(url: str) -> str:
    """
    Loads the given URL using Selenium, takes a screenshot, uploads it to S3, and returns the S3 URL.
    AWS credentials and S3 bucket name must be set in environment variables:
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, S3_BUCKET_NAME
    """
    # Create driver and load page
    driver = create_chrome_driver()
    driver.set_window_size(1920, 1080)  # Set window size for consistent screenshots
    driver.get(url)

    # Take screenshot
    screenshot_bytes = driver.get_screenshot_as_png()
    driver.quit()

    # S3 setup
    s3 = boto3.client("s3")
    bucket = os.environ["S3_BUCKET_NAME"]
    key = f"screenshots/{uuid.uuid4().hex}.png"

    # Upload to S3
    s3.put_object(Bucket=bucket, Key=key, Body=screenshot_bytes, ContentType="image/png")

    # Build S3 URL (assuming public-read or appropriate permissions)
    region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    s3_url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    return s3_url
