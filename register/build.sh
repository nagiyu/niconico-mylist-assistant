docker build \
  --build-arg AWS_DEFAULT_REGION= \
  --build-arg S3_BUCKET_NAME= \
  --build-arg SHARED_SECRET_KEY= \
  --build-arg NOTIFICATION_API_ENDPOINT= \
  -t dev-niconico-mylist-assistant-register .