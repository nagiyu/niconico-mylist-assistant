import { NextRequest, NextResponse } from "next/server";
import { getGoogleUserIdFromSession } from "@shared/auth";

interface SearchResult {
  contentId: string;
  title: string;
  description: string;
  tags: string;
  viewCounter: number;
  startTime: string;
  thumbnailUrl: string;
}

interface SearchResponse {
  status: "success" | "failure";
  results?: SearchResult[];
  message?: string;
}

export async function GET(req: NextRequest) {
  // 認証チェック
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // クエリパラメータから検索キーワードを取得
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("q");

  if (!keyword) {
    return NextResponse.json(
      { error: "search keyword (q) is required" }, 
      { status: 400 }
    );
  }

  try {
    // Niconico 検索APIを呼び出し
    // 再生回数順でソート、上位5件を取得
    const searchUrl = `https://api.search.nicovideo.jp/api/v2/snapshot/video/contents/search` +
      `?q=${encodeURIComponent(keyword)}` +
      `&targets=title,description,tags` +
      `&fields=contentId,title,description,tags,viewCounter,startTime,thumbnailUrl` +
      `&_sort=-viewCounter` +
      `&_limit=5` +
      `&_context=niconico-mylist-assistant`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'niconico-mylist-assistant'
      }
    });

    if (!response.ok) {
      console.error("Search API error:", response.status, response.statusText);
      return NextResponse.json({
        status: "failure",
        message: "検索APIのエラーが発生しました"
      });
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return NextResponse.json({
        status: "failure",
        message: "検索結果が見つかりませんでした"
      });
    }

    const results: SearchResult[] = data.data.map((item: any) => ({
      contentId: item.contentId,
      title: item.title,
      description: item.description || "",
      tags: item.tags || "",
      viewCounter: item.viewCounter || 0,
      startTime: item.startTime || "",
      thumbnailUrl: item.thumbnailUrl || ""
    }));

    const result: SearchResponse = {
      status: "success",
      results: results
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error calling search API:", error);
    return NextResponse.json({
      status: "failure",
      message: "検索中にエラーが発生しました"
    });
  }
}