import { NextRequest, NextResponse } from "next/server";
import { getGoogleUserIdFromSession } from "@shared/auth";
import * as cheerio from 'cheerio';

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

    const results: SearchResult[] = [];
    
    // Niconicoの検索結果をパース
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
          if (results.length >= 5) return false; // 最大5件まで
          
          const $el = $(element);
          let contentId = '';
          let title = '';
          let description = '';
          let tags = '';
          let viewCounter = 0;
          let startTime = '';
          let thumbnailUrl = '';

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

          if (!contentId) return; // contentIdが取得できない場合はスキップ

          // タイトルの抽出
          title = $el.find('.itemTitle a').text().trim() ||
                  $el.find('a[data-video-id]').attr('title') ||
                  $el.find('.videoTitle').text().trim() ||
                  $el.find('h3').text().trim() ||
                  $el.find('.title').text().trim() ||
                  '';

          // 説明文の抽出
          description = $el.find('.itemDescription').text().trim() ||
                       $el.find('.description').text().trim() ||
                       '';

          // タグの抽出
          const tagElements = $el.find('.itemTag, .tag');
          if (tagElements.length > 0) {
            const tagArray: string[] = [];
            tagElements.each((_, tagEl) => {
              const tagText = $(tagEl).text().trim();
              if (tagText) tagArray.push(tagText);
            });
            tags = tagArray.join(' ');
          }

          // 再生回数の抽出
          const viewText = $el.find('.count .play, .playCount, .viewCount').text().trim();
          const viewMatch = viewText.match(/[\d,]+/);
          if (viewMatch) {
            viewCounter = parseInt(viewMatch[0].replace(/,/g, ''), 10) || 0;
          }

          // 投稿日時の抽出
          startTime = $el.find('.itemTime, .time, .postAt').text().trim() || '';

          // サムネイルURLの抽出
          thumbnailUrl = $el.find('img').attr('src') || 
                        $el.find('img').attr('data-src') || 
                        '';

          // 結果に追加
          if (contentId && title) {
            results.push({
              contentId,
              title,
              description,
              tags,
              viewCounter,
              startTime,
              thumbnailUrl
            });
          }
        });
        
        if (results.length > 0) {
          foundResults = true;
          break;
        }
      }
    }

    // HTMLパースがうまくいかない場合、より柔軟なアプローチ
    if (!foundResults) {
      // 動画IDパターンでHTMLから直接検索
      const videoIdPattern = /['"](sm\d+|so\d+|nm\d+)['"][\s\S]*?title['"]\s*:\s*['"]([^'"]+)['"]/g;
      let match;
      let videoCount = 0;
      
      while ((match = videoIdPattern.exec(html)) !== null && videoCount < 5) {
        const contentId = match[1];
        const title = match[2];
        
        if (contentId && title) {
          results.push({
            contentId,
            title,
            description: '',
            tags: '',
            viewCounter: 0,
            startTime: '',
            thumbnailUrl: ''
          });
          videoCount++;
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        status: "failure",
        message: "検索結果が見つかりませんでした"
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