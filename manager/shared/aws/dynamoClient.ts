import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * Get DynamoDB client with appropriate configuration
 * Lambda環境とローカル環境で異なる設定を使用
 */
export function getDynamoClient(): DynamoDBClient {
  if (!!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Lambda環境など、環境変数がない場合は credentials を指定しない
    return new DynamoDBClient({
      region: process.env.AWS_REGION
    });
  }

  return new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}