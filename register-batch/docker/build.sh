#!/bin/bash

docker build \
    -t dev-niconico-mylist-assistant-register-batch \
    -f register-batch/Dockerfile \
    register-batch
