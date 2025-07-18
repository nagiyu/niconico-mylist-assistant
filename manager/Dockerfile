FROM node:20 AS base

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_REGION
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG DYNAMO_TABLE_NAME
ARG REGISTER_LAMBDA_ENDPOINT
ARG SHARED_SECRET_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG VAPID_PRIVATE_KEY
ARG VAPID_SUBJECT

FROM base AS builder

WORKDIR /app

COPY common ../common
WORKDIR /app/../common
RUN npm install && npm run build

WORKDIR /app
COPY manager/. .

RUN npm install && \
    npm run build

FROM base AS runner

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_REGION
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG DYNAMO_TABLE_NAME
ARG REGISTER_LAMBDA_ENDPOINT
ARG SHARED_SECRET_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG VAPID_PRIVATE_KEY
ARG VAPID_SUBJECT

ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV AWS_REGION=${AWS_REGION}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV DYNAMO_TABLE_NAME=${DYNAMO_TABLE_NAME}
ENV REGISTER_LAMBDA_ENDPOINT=${REGISTER_LAMBDA_ENDPOINT}
ENV SHARED_SECRET_KEY=${SHARED_SECRET_KEY}
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
ENV VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
ENV VAPID_SUBJECT=${VAPID_SUBJECT}

ENV AWS_LWA_PORT=3000

WORKDIR /app

COPY --from=builder /app/.next/standalone ./

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

USER node

CMD ["node", "server.js"]
