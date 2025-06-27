#!/bin/bash

docker build \
  --build-arg NEXTAUTH_URL= \
  --build-arg NEXTAUTH_SECRET= \
  --build-arg GOOGLE_CLIENT_ID= \
  --build-arg GOOGLE_CLIENT_SECRET= \
  --build-arg DYNAMO_TABLE_NAME= \
  --build-arg REGISTER_LAMBDA_ENDPOINT= \
  --build-arg SHARED_SECRET_KEY= \
  -t dev-niconico-mylist-assistant-manager .
