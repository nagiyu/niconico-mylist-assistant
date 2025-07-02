import { NextRequest, NextResponse } from "next/server";
import { getGoogleUserIdFromSession } from "@shared/auth";
import { getVideoInfo } from "../utils/videoInfo";

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
    const result = await getVideoInfo(videoId);

    if (result.success && result.title) {
      const response: VideoInfo = {
        status: "success",
        video_id: videoId,
        title: result.title
      };
      return NextResponse.json(response);
    } else {
      return NextResponse.json({
        status: "failure",
        message: result.errorMessage || "ERROR: Could not get video info."
      });
    }

  } catch (error) {
    console.error("Error fetching video info:", error);
    return NextResponse.json({
      status: "failure",
      message: "ERROR: Network or server error."
    });
  }
}