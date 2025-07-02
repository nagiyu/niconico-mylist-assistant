import { NextResponse } from "next/server";
import { getGoogleUserIdFromSession } from "@shared/auth";
import { getDynamoClient } from "@shared/aws";

/**
 * Common API authentication and setup utility
 */
export async function getAuthenticatedApiContext() {
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null,
      client: null,
      tableName: null,
    };
  }

  const client = getDynamoClient();
  const tableName = process.env.DYNAMO_TABLE_NAME || "NiconicoMylistAssistant";

  return {
    error: null,
    userId,
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