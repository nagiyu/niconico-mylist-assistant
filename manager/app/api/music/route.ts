// DynamoDB との連携用 API Route（雛形）

import { NextRequest, NextResponse } from "next/server";

import { IMusic } from "@/app/interface/IMusic";
import { IMusicCommon, IUserMusicSetting } from "@/app/interface/IDynamoMusic";
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/config/authOptions";

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

export async function GET(req: NextRequest) {
  // セッションからUserID取得
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // DynamoDBから全件取得
  const TableName = process.env.DYNAMO_TABLE_NAME || "NiconicoMylistAssistant";
  // GSIを利用して全件取得（DataTypeで絞り込みたい場合はGSIを利用）
  // ここでは全件取得のままですが、必要に応じてQuery+GSIを推奨
  const client = getDynamoClient();
  const scanCommand = new ScanCommand({ TableName });
  const result = await client.send(scanCommand);

  // データを分離
  const items = result.Items || [];
  const musicList: IMusicCommon[] = [];
  const userSettings: IUserMusicSetting[] = [];

  for (const item of items) {
    if (item.DataType.S === "music") {
      musicList.push({
        ID: item.ID?.S ?? "",
        DataType: "music",
        Create: item.Create?.S ?? "",
        Update: item.Update?.S ?? "",
        Delete: item.Delete?.S ?? "",
        MusicID: item.MusicID?.S ?? "",
        Title: item.Title?.S ?? "",
      });
    } else if (item.DataType.S === "user" && item.UserID?.S === userId) {
      userSettings.push({
        ID: item.ID?.S ?? "",
        DataType: "user",
        Create: item.Create?.S ?? "",
        Update: item.Update?.S ?? "",
        Delete: item.Delete?.S ?? "",
        MusicID: item.MusicID?.S ?? "",
        UserID: item.UserID?.S ?? "",
        favorite: item.favorite?.BOOL ?? false,
        skip: item.skip?.BOOL ?? false,
        memo: item.memo?.S ?? "",
      });
    }
  }

  // マージして返却
  const data: IMusic[] = musicList.map((music) => {
    const user = userSettings.find((u) => u.MusicID === music.MusicID);
    return {
      music_common_id: music.ID,
      user_music_setting_id: user?.ID ?? "",
      music_id: music.MusicID,
      title: music.Title,
      favorite: user?.favorite ?? false,
      skip: user?.skip ?? false,
      memo: user?.memo ?? "",
    };
  });

  return NextResponse.json(data);
}

import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  // 新規作成
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body: IMusic = await req.json();
  const TableName = process.env.DYNAMO_TABLE_NAME || "NiconicoMylistAssistant";
  const now = new Date().toISOString();

  // 同じMusicIDが既に存在するかチェック
  const client = getDynamoClient();
  const checkCommand = new ScanCommand({
    TableName,
    FilterExpression: "DataType = :datatype AND MusicID = :musicid AND UserID = :userid",
    ExpressionAttributeValues: {
      ":datatype": { S: "user" },
      ":musicid": { S: body.music_id },
      ":userid": { S: userId },
    },
  });

  const existingResult = await client.send(checkCommand);
  if (existingResult.Items && existingResult.Items.length > 0) {
    return NextResponse.json({ error: "この楽曲ID（" + body.music_id + "）は既に追加されています。" }, { status: 400 });
  }

  // サーバー側でUUID生成
  const music_common_id = randomUUID();
  const user_music_setting_id = randomUUID();

  // 音楽共通情報（DataType: "music"）
  const musicItem = {
    ID: { S: music_common_id },
    DataType: { S: "music" },
    Create: { S: now },
    Update: { S: now },
    Delete: { S: "" },
    MusicID: { S: body.music_id },
    Title: { S: body.title },
  };

  // ユーザー個人設定（DataType: "user"）
  const userItem = {
    ID: { S: user_music_setting_id },
    DataType: { S: "user" },
    Create: { S: now },
    Update: { S: now },
    Delete: { S: "" },
    MusicID: { S: body.music_id },
    UserID: { S: userId },
    favorite: { BOOL: body.favorite },
    skip: { BOOL: body.skip },
    memo: { S: body.memo ?? "" },
  };

  // PutItemCommandで2件保存（ID, DataTypeでユニーク）
  await client.send(new PutItemCommand({ TableName, Item: musicItem }));
  await client.send(new PutItemCommand({ TableName, Item: userItem }));

  // 生成したUUIDも返却
  return NextResponse.json({ ok: true, music_common_id, user_music_setting_id });
}

export async function PUT(req: NextRequest) {
  // 更新
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body: IMusic = await req.json();
  const TableName = process.env.DYNAMO_TABLE_NAME || "NiconicoMylistAssistant";
  const now = new Date().toISOString();

  // 音楽共通情報（titleのみ更新想定）
  const client = getDynamoClient();
  await client.send(
    new UpdateItemCommand({
      TableName,
      Key: { ID: { S: body.music_common_id }, DataType: { S: "music" } },
      UpdateExpression: "SET #musicid = :musicid, #title = :title, #update = :update",
      ExpressionAttributeNames: {
        "#musicid": "MusicID",
        "#title": "Title",
        "#update": "Update",
      },
      ExpressionAttributeValues: {
        ":musicid": { S: body.music_id },
        ":title": { S: body.title },
        ":update": { S: now },
      },
    })
  );

  // ユーザー個人設定
  if (!body.user_music_setting_id) {
    // user_music_setting_idがなければ新規追加
    const user_music_setting_id = randomUUID();
    await client.send(
      new PutItemCommand({
        TableName,
        Item: {
          ID: { S: user_music_setting_id },
          DataType: { S: "user" },
          Create: { S: now },
          Update: { S: now },
          Delete: { S: "" },
          MusicID: { S: body.music_id },
          UserID: { S: userId },
          favorite: { BOOL: body.favorite },
          skip: { BOOL: body.skip },
          memo: { S: body.memo ?? "" },
        },
      })
    );
  } else {
    // user_music_setting_idがあれば更新
    await client.send(
      new UpdateItemCommand({
        TableName,
        Key: { ID: { S: body.user_music_setting_id }, DataType: { S: "user" } },
        UpdateExpression: "SET #musicid = :musicid, #favorite = :favorite, #skip = :skip, #memo = :memo, #update = :update, #userid = :userid",
        ExpressionAttributeNames: {
          "#musicid": "MusicID",
          "#favorite": "favorite",
          "#skip": "skip",
          "#memo": "memo",
          "#update": "Update",
          "#userid": "UserID",
        },
        ExpressionAttributeValues: {
          ":musicid": { S: body.music_id },
          ":favorite": { BOOL: body.favorite },
          ":skip": { BOOL: body.skip },
          ":memo": { S: body.memo ?? "" },
          ":update": { S: now },
          ":userid": { S: userId },
        },
      })
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  // 削除
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body: { music_common_id: string; user_music_setting_id: string } = await req.json();
  const TableName = process.env.DYNAMO_TABLE_NAME || "NiconicoMylistAssistant";

  // 音楽共通情報削除
  const client = getDynamoClient();
  await client.send(
    new DeleteItemCommand({
      TableName,
      Key: { ID: { S: body.music_common_id }, DataType: { S: "music" } },
    })
  );

  // ユーザー個人設定削除
  await client.send(
    new DeleteItemCommand({
      TableName,
      Key: { ID: { S: body.user_music_setting_id }, DataType: { S: "user" } },
    })
  );

  return NextResponse.json({ ok: true });
}
