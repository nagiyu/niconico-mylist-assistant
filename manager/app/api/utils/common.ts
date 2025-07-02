import { NextResponse } from "next/server";
import { getGoogleUserIdFromSession } from "@shared/auth";
import { getDynamoClient } from "@shared/aws";

/**
 * API authentication utility
 */
export async function getAuthenticatedApiContext() {
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null,
    };
  }

  return {
    error: null,
    userId,
  };
}

/**
 * AWS DynamoDB context utility
 */
export function getAwsContext() {
  const client = getDynamoClient();
  const tableName = process.env.DYNAMO_TABLE_NAME || "NiconicoMylistAssistant";

  return {
    client,
    tableName,
  };
}

/**
 * Create an ISO timestamp for current time
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}