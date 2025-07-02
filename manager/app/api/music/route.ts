// DynamoDB との連携用 API Route（雛形）

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { IMusic } from "@/app/interface/IMusic";
import { IMusicCommon, IUserMusicSetting } from "@/app/interface/IDynamoMusic";
import { PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { getAuthenticatedApiContext, getAwsContext, getCurrentTimestamp } from "@/app/api/utils/common";

export async function GET(req: NextRequest) {
  // セッションからUserID取得
  const { error, userId } = await getAuthenticatedApiContext();
  if (error) return error;

  // AWS情報取得
  const { client, tableName } = getAwsContext();

  // DynamoDBから全件取得
  // GSIを利用して全件取得（DataTypeで絞り込みたい場合はGSIを利用）
  // ここでは全件取得のままですが、必要に応じてQuery+GSIを推奨
  const scanCommand = new ScanCommand({ TableName: tableName });
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

export async function POST(req: NextRequest) {
  // 新規作成
  const { error, userId } = await getAuthenticatedApiContext();
  if (error) return error;

  // AWS情報取得
  const { client, tableName } = getAwsContext();

  const body: IMusic = await req.json();
  const now = getCurrentTimestamp();
  
  // 音楽共通情報が既に存在するかチェック
  const musicCheckCommand = new ScanCommand({
    TableName: tableName,
    FilterExpression: "DataType = :datatype AND MusicID = :musicid",
    ExpressionAttributeValues: {
      ":datatype": { S: "music" },
      ":musicid": { S: body.music_id },
    },
  });

  const musicResult = await client.send(musicCheckCommand);
  const musicExists = musicResult.Items && musicResult.Items.length > 0;

  if (musicExists) {
    return NextResponse.json({ error: "この楽曲ID（" + body.music_id + "）は既に追加されています。" }, { status: 400 });
  }

  // サーバー側でUUID生成
  const music_common_id = randomUUID();
  const user_music_setting_id = randomUUID();

  // 音楽共通情報を作成
  const musicItem = {
    ID: { S: music_common_id },
    DataType: { S: "music" },
    Create: { S: now },
    Update: { S: now },
    Delete: { S: "" },
    MusicID: { S: body.music_id },
    Title: { S: body.title },
  };
  await client.send(new PutItemCommand({ TableName: tableName, Item: musicItem }));

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

  await client.send(new PutItemCommand({ TableName: tableName, Item: userItem }));

  // 生成したUUIDも返却
  return NextResponse.json({ ok: true, music_common_id, user_music_setting_id });
}

export async function PUT(req: NextRequest) {
  // 更新
  const { error, userId } = await getAuthenticatedApiContext();
  if (error) return error;

  // AWS情報取得
  const { client, tableName } = getAwsContext();

  const body: IMusic = await req.json();
  const now = getCurrentTimestamp();

  // 音楽共通情報（titleのみ更新想定）
  await client.send(
    new UpdateItemCommand({
      TableName: tableName,
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
        TableName: tableName,
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
        TableName: tableName,
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
  const { error, userId } = await getAuthenticatedApiContext();
  if (error) return error;

  // AWS情報取得
  const { client, tableName } = getAwsContext();

  const body: { music_common_id: string; user_music_setting_id: string } = await req.json();

  // 音楽共通情報削除
  await client.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: { ID: { S: body.music_common_id }, DataType: { S: "music" } },
    })
  );

  // ユーザー個人設定削除
  await client.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: { ID: { S: body.user_music_setting_id }, DataType: { S: "user" } },
    })
  );

  return NextResponse.json({ ok: true });
}
