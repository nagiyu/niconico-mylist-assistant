FROM public.ecr.aws/lambda/python:3.13

RUN dnf install -y atk cups-libs gtk3 libXcomposite alsa-lib \
    libXcursor libXdamage libXext libXi libXrandr libXScrnSaver \
    libXtst pango at-spi2-atk libXt xorg-x11-server-Xvfb \
    xorg-x11-xauth dbus-glib dbus-glib-devel nss mesa-libgbm \
    libgbm libxkbcommon libdrm \
    git

COPY handler.py ${LAMBDA_TASK_ROOT}
COPY requirements.txt ${LAMBDA_TASK_ROOT}
COPY app ${LAMBDA_TASK_ROOT}/app

RUN pip install -r requirements.txt

# Accept AWS credentials and S3 bucket as build arguments
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_DEFAULT_REGION
ARG S3_BUCKET_NAME

ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}
ENV S3_BUCKET_NAME=${S3_BUCKET_NAME}

ENV SE_CACHE_PATH=/tmp

RUN dnf install -y shadow-utils && \
    /usr/sbin/useradd --uid 1000 user
USER user

CMD ["handler.lambda_handler"]
