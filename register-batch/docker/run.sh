#!/bin/bash

docker run \
    --rm \
    --env-file register-batch/.env \
    dev-niconico-mylist-assistant-register-batch
