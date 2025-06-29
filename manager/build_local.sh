#!/bin/bash

docker build \
  --build-arg AWS_ACCESS_KEY_ID= \
  --build-arg AWS_SECRET_ACCESS_KEY= \
  --build-arg AWS_REGION= \
  --build-arg NEXTAUTH_URL= \
  --build-arg NEXTAUTH_SECRET= \
  --build-arg GOOGLE_CLIENT_ID= \
  --build-arg GOOGLE_CLIENT_SECRET= \
  --build-arg DYNAMO_TABLE_NAME= \
  --build-arg REGISTER_LAMBDA_ENDPOINT= \
  --build-arg SHARED_SECRET_KEY= \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY= \
  --build-arg VAPID_PRIVATE_KEY= \
  -t dev-niconico-mylist-assistant-manager .
