FROM mcr.microsoft.com/devcontainers/python:2-3.12-bullseye

RUN apt -y update && apt -y install \
    wget \
    unzip \
    curl \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libnspr4 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxrandr2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    libxss1 \
    libgbm1 \
    xvfb \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*
