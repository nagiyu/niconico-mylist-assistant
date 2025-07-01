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

  console.log(`[Search API] Starting search request`);
  console.log(`[Search API] User authenticated: ${userId}`);
  console.log(`[Search API] Searching for keyword: ${keyword}`);

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

    console.log(`[Search API] Calling Niconico API: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
        'Referer': 'https://www.nicovideo.jp/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
      }
    });

    console.log(`[Search API] Niconico API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Search API] Niconico API error: ${response.status} ${response.statusText}`);
      console.error(`[Search API] Error response body: ${errorText}`);
      return NextResponse.json({
        status: "failure",
        message: "検索APIのエラーが発生しました"
      });
    }

    const data = await response.json();
    console.log(`[Search API] Successfully received search results: ${data.data?.length || 0} items`);

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