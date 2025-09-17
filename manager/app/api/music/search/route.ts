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
  debug?: any;
}

/**
 * Enhanced video ID extraction with multiple strategies
 */
function extractVideoIds(html: string, cheerioInstance: ReturnType<typeof cheerio.load>): { ids: string[], debug: any } {
  const debug: any = {
    strategies: {},
    htmlSnippet: html.substring(0, 500),
    htmlLength: html.length
  };
  
  const allVideoIds = new Set<string>();
  const $ = cheerioInstance;

  // Strategy 1: Try updated CSS selectors for current Niconico structure
  const modernSelectors = [
    // Common modern patterns
    '[data-video-id]',
    '[data-content-id]', 
    '[data-video]',
    '.video-item',
    '.search-result-item',
    '.searchResultItems li',
    '.searchItem',
    '.videoListItem',
    // Generic selectors
    '.item',
    '.result',
    '.card',
    // Link-based selectors
    'a[href*="/watch/"]',
    '[href*="/watch/"]',
    // Legacy selectors
    '.searchUnevaluatedVideoList li',
    '.searchVideoList li'
  ];

  debug.strategies.cssSelectors = {};
  
  for (const selector of modernSelectors) {
    try {
      const elements = $(selector);
      debug.strategies.cssSelectors[selector] = elements.length;
      
      if (elements.length > 0) {
        elements.each((index, element) => {
          if (allVideoIds.size >= 20) return false; // Increased limit for better results
          
          const $el = $(element);
          
          // Try multiple attribute patterns
          const videoIdAttributes = [
            'data-video-id',
            'data-content-id',
            'data-video',
            'data-id',
            'video-id',
            'content-id'
          ];
          
          let contentId = '';
          
          // Check attributes
          for (const attr of videoIdAttributes) {
            contentId = $el.attr(attr) || '';
            if (contentId && /^[a-z]{2}\d+$/.test(contentId)) {
              break;
            }
          }
          
          // If no direct attribute, try to extract from href
          if (!contentId) {
            const href = $el.find('a[href*="/watch/"]').attr('href') || $el.attr('href') || '';
            const match = href.match(/\/watch\/([a-z]{2}\d+)/);
            if (match) {
              contentId = match[1];
            }
          }
          
          // Also check if element text contains video ID
          if (!contentId) {
            const text = $el.text();
            const textMatch = text.match(/\b([a-z]{2}\d+)\b/);
            if (textMatch) {
              contentId = textMatch[1];
            }
          }
          
          if (contentId && /^[a-z]{2}\d+$/.test(contentId)) {
            allVideoIds.add(contentId);
          }
        });
      }
    } catch (error) {
      debug.strategies.cssSelectors[selector + '_error'] = error instanceof Error ? error.message : String(error);
    }
  }

  // Strategy 2: JSON data extraction
  debug.strategies.jsonExtraction = {};
  
  try {
    // Look for JSON data in script tags
    const scriptTags = $('script');
    let jsonDataFound = 0;
    
    scriptTags.each((index, element) => {
      const scriptContent = $(element).html() || '';
      
      // Pattern 1: Look for contentId in JSON
      const contentIdMatches = scriptContent.match(/"contentId":\s*"([a-z]{2}\d+)"/g);
      if (contentIdMatches) {
        jsonDataFound += contentIdMatches.length;
        contentIdMatches.forEach(match => {
          const idMatch = match.match(/"contentId":\s*"([a-z]{2}\d+)"/);
          if (idMatch) {
            allVideoIds.add(idMatch[1]);
          }
        });
      }
      
      // Pattern 2: Look for video IDs in any JSON structure
      const videoIdMatches = scriptContent.match(/"(?:video[Ii]d|id|contentId)":\s*"([a-z]{2}\d+)"/g);
      if (videoIdMatches) {
        jsonDataFound += videoIdMatches.length;
        videoIdMatches.forEach(match => {
          const idMatch = match.match(/"(?:video[Ii]d|id|contentId)":\s*"([a-z]{2}\d+)"/);
          if (idMatch) {
            allVideoIds.add(idMatch[1]);
          }
        });
      }
    });
    
    debug.strategies.jsonExtraction.scriptTagsChecked = scriptTags.length;
    debug.strategies.jsonExtraction.videoIdsFound = jsonDataFound;
  } catch (error) {
    debug.strategies.jsonExtraction.error = error instanceof Error ? error.message : String(error);
  }

  // Strategy 3: Enhanced regex patterns
  debug.strategies.regexPatterns = {};
  
  const regexPatterns = [
    // Enhanced patterns for various contexts
    /['"](sm\d+|so\d+|nm\d+)['"][\s\S]*?/g,
    /data-[^=]*=["']([a-z]{2}\d+)["']/g,
    /\/watch\/([a-z]{2}\d+)/g,
    /"contentId":\s*"([a-z]{2}\d+)"/g,
    /"id":\s*"([a-z]{2}\d+)"/g,
    /\b([a-z]{2}\d{6,})\b/g, // Broader pattern for video IDs
  ];
  
  regexPatterns.forEach((pattern, index) => {
    try {
      let match;
      let count = 0;
      const patternName = `pattern_${index}`;
      
      while ((match = pattern.exec(html)) !== null && count < 50) {
        const contentId = match[1];
        
        if (contentId && /^[a-z]{2}\d+$/.test(contentId)) {
          allVideoIds.add(contentId);
          count++;
        }
      }
      
      debug.strategies.regexPatterns[patternName] = count;
    } catch (error) {
      debug.strategies.regexPatterns[`pattern_${index}_error`] = error instanceof Error ? error.message : String(error);
    }
  });

  // Strategy 4: Check for common page indicators
  debug.strategies.pageAnalysis = {
    containsNicovideo: html.includes('nicovideo'),
    containsSearch: html.includes('search') || html.includes('検索'),
    containsWatch: html.includes('/watch/'),
    containsVideoId: /[a-z]{2}\d+/.test(html),
    isHTML: html.includes('<html'),
    hasJavaScript: html.includes('<script'),
    probablyError: html.includes('error') || html.includes('エラー'),
    probablyBlocked: html.includes('blocked') || html.includes('ブロック'),
  };

  return {
    ids: Array.from(allVideoIds).slice(0, 10), // Limit to top 10 results
    debug
  };
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

  // Enhanced logging for debugging
  console.log(`[SEARCH] Starting search for keyword: "${keyword}"`);

  try {
    // Niconico 検索ページのHTMLを取得
    const searchUrl = `https://www.nicovideo.jp/search/${encodeURIComponent(keyword)}?sort=v&order=d`;
    console.log(`[SEARCH] Fetching URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache'
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(15000)
    });

    console.log(`[SEARCH] Response status: ${response.status}, headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorMessage = `検索ページの取得でエラーが発生しました (HTTP ${response.status}: ${response.statusText})`;
      console.error(`[SEARCH] ${errorMessage}`);
      return NextResponse.json({
        status: "failure",
        message: errorMessage
      });
    }

    const html = await response.text();
    console.log(`[SEARCH] Received HTML length: ${html.length} characters`);

    const $ = cheerio.load(html);
    console.log(`[SEARCH] HTML parsed with Cheerio successfully`);

    // Enhanced video ID extraction
    const extraction = extractVideoIds(html, $);
    const videoIds = extraction.ids;
    
    console.log(`[SEARCH] Video ID extraction completed. Found ${videoIds.length} unique video IDs:`, videoIds);
    console.log(`[SEARCH] Extraction debug info:`, JSON.stringify(extraction.debug, null, 2));

    if (videoIds.length === 0) {
      const errorMessage = "検索結果からビデオIDを抽出できませんでした";
      console.error(`[SEARCH] ${errorMessage}`);
      return NextResponse.json({
        status: "failure",
        message: errorMessage,
        debug: extraction.debug
      });
    }

    // 各ビデオIDについてタイトルを取得
    const results: SearchResult[] = [];
    console.log(`[SEARCH] Fetching video info for ${videoIds.length} videos...`);
    
    for (const videoId of videoIds) {
      try {
        console.log(`[SEARCH] Fetching info for video: ${videoId}`);
        const videoInfo = await getVideoInfo(videoId);
        if (videoInfo.success && videoInfo.title) {
          results.push({
            contentId: videoId,
            title: videoInfo.title
          });
          console.log(`[SEARCH] Successfully got info for ${videoId}: "${videoInfo.title}"`);
        } else {
          console.warn(`[SEARCH] Failed to get info for ${videoId}: ${videoInfo.errorMessage}`);
        }
      } catch (error) {
        console.error(`[SEARCH] Error getting info for video ${videoId}:`, error);
      }
    }

    console.log(`[SEARCH] Final results: ${results.length} videos with complete info`);

    if (results.length === 0) {
      const errorMessage = "動画情報の取得に失敗しました";
      console.error(`[SEARCH] ${errorMessage}`);
      return NextResponse.json({
        status: "failure",
        message: errorMessage,
        debug: {
          videoIdsFound: videoIds.length,
          videoIdsList: videoIds,
          extractionDebug: extraction.debug
        }
      });
    }

    const result: SearchResponse = {
      status: "success",
      results: results
    };

    console.log(`[SEARCH] Search completed successfully with ${results.length} results`);
    return NextResponse.json(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SEARCH] Critical error during search:`, error);
    
    return NextResponse.json({
      status: "failure",
      message: "検索中にエラーが発生しました",
      debug: {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        keyword: keyword
      }
    });
  }
}