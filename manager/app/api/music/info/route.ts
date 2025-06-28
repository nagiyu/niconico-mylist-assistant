import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/config/authOptions";

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

interface VideoInfo {
  status: "success" | "failure";
  message?: string;
  video_id?: string;
  title?: string;
}

export async function GET(req: NextRequest) {
  // 認証チェック
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // video_idをクエリパラメータから取得
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("video_id");

  if (!videoId) {
    return NextResponse.json(
      { error: "video_id is required" }, 
      { status: 400 }
    );
  }

  try {
    // Niconico APIから情報を取得
    const apiUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json({
        status: "failure",
        message: "ERROR: Failure getting info."
      });
    }

    const xmlText = await response.text();
    
    // XMLパースエラーをチェック
    if (!xmlText || xmlText.trim() === "") {
      return NextResponse.json({
        status: "failure",
        message: "ERROR: Empty response from API."
      });
    }

    // エラーレスポンスをチェック (XMLに<error>タグが含まれている場合)
    if (xmlText.includes('<error>')) {
      return NextResponse.json({
        status: "failure",
        message: "ERROR: Not Found or Invalid video ID."
      });
    }

    // タイトルを抽出 (正規表現を使用してシンプルに)
    const titleMatch = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    if (!titleMatch) {
      return NextResponse.json({
        status: "failure",
        message: "ERROR: Could not extract title from response."
      });
    }

    const title = titleMatch[1];

    const result: VideoInfo = {
      status: "success",
      video_id: videoId,
      title: title
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error fetching video info:", error);
    return NextResponse.json({
      status: "failure",
      message: "ERROR: Network or server error."
    });
  }
}