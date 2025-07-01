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
  console.log("[Search API] Starting search request");
  
  // 認証チェック
  const userId = await getGoogleUserIdFromSession();
  if (!userId) {
    console.log("[Search API] Authentication failed - no user ID");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  console.log("[Search API] User authenticated:", userId);

  // クエリパラメータから検索キーワードを取得
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("q");

  if (!keyword) {
    console.log("[Search API] No search keyword provided");
    return NextResponse.json(
      { error: "search keyword (q) is required" }, 
      { status: 400 }
    );
  }
  
  console.log("[Search API] Searching for keyword:", keyword);

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

    console.log("[Search API] Calling Niconico API:", searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'niconico-mylist-assistant'
      }
    });

    console.log("[Search API] Niconico API response status:", response.status);

    if (!response.ok) {
      console.error("[Search API] Niconico API error:", response.status, response.statusText);
      // Try to get error response body for better debugging
      try {
        const errorText = await response.text();
        console.error("[Search API] Error response body:", errorText);
      } catch (e) {
        console.error("[Search API] Could not read error response body");
      }
      return NextResponse.json({
        status: "failure",
        message: "検索APIのエラーが発生しました"
      });
    }

    const data = await response.json();
    console.log("[Search API] Response data structure:", {
      hasData: !!data.data,
      dataType: typeof data.data,
      isArray: Array.isArray(data.data),
      dataLength: data.data ? data.data.length : 0
    });

    if (!data.data || !Array.isArray(data.data)) {
      console.error("[Search API] Invalid response format from Niconico API:", data);
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

    console.log("[Search API] Successfully processed", results.length, "search results");

    const result: SearchResponse = {
      status: "success",
      results: results
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("[Search API] Error calling search API:", error);
    return NextResponse.json({
      status: "failure",
      message: "検索中にエラーが発生しました"
    });
  }
}