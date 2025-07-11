import { NextRequest, NextResponse } from "next/server";
import { PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { getAuthenticatedApiContext, getAwsContext, getCurrentTimestamp } from "@/app/api/utils/common";

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
  successfulItems: {
    music_id: string;
    music_common_id: string;
    title: string;
  }[];
}

export async function POST(req: NextRequest) {
  // Bulk import for music items only (DataType: "music")
  const { error, userId } = await getAuthenticatedApiContext();
  if (error) return error;

  // AWS情報取得
  const { client, tableName } = getAwsContext();

  const body: BulkImportRequest = await req.json();
  const now = getCurrentTimestamp();

  // Get existing music items to avoid duplicates
  const scanCommand = new ScanCommand({ 
    TableName: tableName,
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
    },
    successfulItems: []
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

      await client.send(new PutItemCommand({ TableName: tableName, Item: musicItem }));
      
      result.success++;
      result.details.success.push(item.music_id);
      result.successfulItems.push({
        music_id: item.music_id,
        music_common_id: music_common_id,
        title: item.title
      });
      
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