import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/config/authOptions";
import { randomUUID } from "crypto";

function getDynamoClient() {
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

// セッションからGoogleアクセストークンを取得し、ユーザーIDを取得
async function getGoogleUserIdFromSession(): Promise<string> {
  const session = await getServerSession(authOptions);
  const accessToken = session?.tokens?.find(t => t.provider === "google")?.accessToken;
  if (!accessToken) return "";
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.sub || "";
}

interface BulkImportItem {
  music_id: string;
  title: string;
}

interface BulkImportRequest {
  items: BulkImportItem[];
}

interface BulkImportResponse {
  success: number;
  failure: number;
  skip: number;
  details: {
    success: string[];
    failure: string[];
    skip: string[];
  };
}

export async function POST(req: NextRequest) {
  // Bulk import for music items only (DataType: "music")
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: BulkImportRequest = await req.json();
  const TableName = process.env.DYNAMO_TABLE_NAME || "NiconicoMylistAssistant";
  const now = new Date().toISOString();
  const client = getDynamoClient();

  // Get existing music items to avoid duplicates
  const scanCommand = new ScanCommand({ 
    TableName,
    FilterExpression: "DataType = :dataType",
    ExpressionAttributeValues: {
      ":dataType": { S: "music" }
    }
  });
  const existingItems = await client.send(scanCommand);
  const existingMusicIds = new Set(
    (existingItems.Items || []).map(item => item.MusicID?.S).filter(Boolean)
  );

  const result: BulkImportResponse = {
    success: 0,
    failure: 0,
    skip: 0,
    details: {
      success: [],
      failure: [],
      skip: []
    }
  };

  // Process each item
  for (const item of body.items) {
    try {
      // Skip if already exists
      if (existingMusicIds.has(item.music_id)) {
        result.skip++;
        result.details.skip.push(item.music_id);
        continue;
      }

      // Create new music item (DataType: "music" only)
      const music_common_id = randomUUID();
      const musicItem = {
        ID: { S: music_common_id },
        DataType: { S: "music" },
        Create: { S: now },
        Update: { S: now },
        Delete: { S: "" },
        MusicID: { S: item.music_id },
        Title: { S: item.title },
      };

      await client.send(new PutItemCommand({ TableName, Item: musicItem }));
      
      result.success++;
      result.details.success.push(item.music_id);
      
      // Add to existing set to avoid duplicates within the same batch
      existingMusicIds.add(item.music_id);
    } catch (error) {
      console.error("Failed to import item:", item, error);
      result.failure++;
      result.details.failure.push(item.music_id);
    }
  }

  return NextResponse.json(result);
}