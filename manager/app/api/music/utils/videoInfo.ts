/**
 * Shared utility for getting video information from Niconico API
 */

export interface VideoInfoResult {
  success: boolean;
  videoId?: string;
  title?: string;
  errorMessage?: string;
}

export async function getVideoInfo(videoId: string): Promise<VideoInfoResult> {
  try {
    // Validate video ID format
    if (!videoId || !/^[a-z]{2}\d+$/.test(videoId)) {
      console.warn(`[VIDEO_INFO] Invalid video ID format: ${videoId}`);
      return {
        success: false,
        errorMessage: "ERROR: Invalid video ID format."
      };
    }

    // Niconico APIから情報を取得
    const apiUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;
    console.log(`[VIDEO_INFO] Fetching info for ${videoId} from ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; niconico-mylist-assistant/1.0)'
      }
    });

    console.log(`[VIDEO_INFO] Response for ${videoId}: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorMessage = `ERROR: HTTP ${response.status} - ${response.statusText}`;
      console.error(`[VIDEO_INFO] ${errorMessage} for video ${videoId}`);
      return {
        success: false,
        errorMessage: errorMessage
      };
    }

    const xmlText = await response.text();
    console.log(`[VIDEO_INFO] Received XML length for ${videoId}: ${xmlText.length} characters`);
    
    // XMLパースエラーをチェック
    if (!xmlText || xmlText.trim() === "") {
      console.error(`[VIDEO_INFO] Empty response for video ${videoId}`);
      return {
        success: false,
        errorMessage: "ERROR: Empty response from API."
      };
    }

    // エラーレスポンスをチェック (XMLに<error>タグが含まれている場合)
    if (xmlText.includes('<error>')) {
      // Extract specific error message if available
      const errorMatch = xmlText.match(/<error><description>(.*?)<\/description><\/error>/);
      const specificError = errorMatch ? errorMatch[1] : "Unknown error";
      console.warn(`[VIDEO_INFO] API error for ${videoId}: ${specificError}`);
      return {
        success: false,
        errorMessage: `ERROR: ${specificError}`
      };
    }

    // タイトルを抽出 (CDATA形式と通常形式の両方に対応)
    let titleMatch = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    if (!titleMatch) {
      // CDATA形式でない場合は通常の形式を試す
      titleMatch = xmlText.match(/<title>(.*?)<\/title>/);
    }
    
    if (!titleMatch) {
      console.error(`[VIDEO_INFO] Could not extract title for ${videoId}. XML snippet: ${xmlText.substring(0, 200)}`);
      return {
        success: false,
        errorMessage: "ERROR: Could not extract title from response."
      };
    }

    const title = titleMatch[1];
    console.log(`[VIDEO_INFO] Successfully extracted title for ${videoId}: "${title}"`);

    return {
      success: true,
      videoId: videoId,
      title: title
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[VIDEO_INFO] Error fetching video info for ${videoId}:`, error);
    return {
      success: false,
      errorMessage: `ERROR: ${errorMessage}`
    };
  }
}