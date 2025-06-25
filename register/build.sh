docker build \
  --build-arg AWS_DEFAULT_REGION= \
  --build-arg S3_BUCKET_NAME= \
  -t python-lambda .