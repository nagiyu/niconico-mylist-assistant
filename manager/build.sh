#!/bin/bash

docker build \
  --build-arg NEXTAUTH_URL= \
  --build-arg NEXTAUTH_SECRET= \
  --build-arg GOOGLE_CLIENT_ID= \
  --build-arg GOOGLE_CLIENT_SECRET= \
  -t dev-niconico-mylist-assistant-manager .
