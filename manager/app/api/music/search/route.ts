import { NextRequest, NextResponse } from "next/server";
import { getGoogleUserIdFromSession } from "@shared/auth";
import * as cheerio from 'cheerio';
import { getVideoInfo } from "../utils/videoInfo";

interface SearchResult {
  contentId: string;
  title: string;
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
    // Niconico 検索ページのHTMLを取得
    // 再生回数順でソート、上位5件を取得するため、sort=vオプションを使用
    const searchUrl = `https://www.nicovideo.jp/search/${encodeURIComponent(keyword)}?sort=v&order=d`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
      }
    });

    if (!response.ok) {
      console.error("Search page error:", response.status, response.statusText);
      return NextResponse.json({
        status: "failure",
        message: "検索ページの取得でエラーが発生しました"
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const videoIds: string[] = [];
    
    // ニコニコの検索結果からビデオIDのみを抽出
    // 様々な可能性のあるセレクタを試す
    const searchResultSelectors = [
      '[data-video-id]',           // data-video-id属性を持つ要素
      '.searchUnevaluatedVideoList li',  // 一般的な検索結果リスト
      '.searchVideoList li',       // 別の検索結果リスト形式
      '.item',                     // アイテムクラス
      '[href*="/watch/"]'          // watch URLを含むリンク
    ];

    let foundResults = false;
    
    for (const selector of searchResultSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((index, element) => {
          if (videoIds.length >= 5) return false; // 最大5件まで
          
          const $el = $(element);
          let contentId = '';

          // contentIdの抽出
          contentId = $el.attr('data-video-id') || '';
          if (!contentId) {
            // data-video-id属性がない場合、href属性から抽出
            const href = $el.find('a[href*="/watch/"]').attr('href') || $el.attr('href') || '';
            const match = href.match(/\/watch\/([a-z]{2}\d+)/);
            if (match) {
              contentId = match[1];
            }
          }

          if (contentId && !videoIds.includes(contentId)) {
            videoIds.push(contentId);
          }
        });
        
        if (videoIds.length > 0) {
          foundResults = true;
          break;
        }
      }
    }

    // HTMLパースがうまくいかない場合、より柔軟なアプローチ
    if (!foundResults) {
      // 動画IDパターンでHTMLから直接検索
      const videoIdPattern = /['"](sm\d+|so\d+|nm\d+)['"][\s\S]*?/g;
      let match;
      let videoCount = 0;
      
      while ((match = videoIdPattern.exec(html)) !== null && videoCount < 5) {
        const contentId = match[1];
        
        if (contentId && !videoIds.includes(contentId)) {
          videoIds.push(contentId);
          videoCount++;
        }
      }
    }

    if (videoIds.length === 0) {
      return NextResponse.json({
        status: "failure",
        message: "検索結果が見つかりませんでした"
      });
    }

    // 各ビデオIDについてタイトルを取得
    const results: SearchResult[] = [];
    for (const videoId of videoIds) {
      try {
        const videoInfo = await getVideoInfo(videoId);
        if (videoInfo.success && videoInfo.title) {
          results.push({
            contentId: videoId,
            title: videoInfo.title
          });
        }
      } catch (error) {
        console.error(`Error getting info for video ${videoId}:`, error);
        // エラーが発生した場合はスキップして続行
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        status: "failure",
        message: "動画情報の取得に失敗しました"
      });
    }

    const result: SearchResponse = {
      status: "success",
      results: results
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error parsing search HTML:", error);
    return NextResponse.json({
      status: "failure",
      message: "検索中にエラーが発生しました"
    });
  }
}