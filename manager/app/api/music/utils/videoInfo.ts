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
    // Niconico APIから情報を取得
    const apiUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return {
        success: false,
        errorMessage: "ERROR: Failure getting info."
      };
    }

    const xmlText = await response.text();
    
    // XMLパースエラーをチェック
    if (!xmlText || xmlText.trim() === "") {
      return {
        success: false,
        errorMessage: "ERROR: Empty response from API."
      };
    }

    // エラーレスポンスをチェック (XMLに<error>タグが含まれている場合)
    if (xmlText.includes('<error>')) {
      return {
        success: false,
        errorMessage: "ERROR: Not Found or Invalid video ID."
      };
    }

    // タイトルを抽出 (CDATA形式と通常形式の両方に対応)
    let titleMatch = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    if (!titleMatch) {
      // CDATA形式でない場合は通常の形式を試す
      titleMatch = xmlText.match(/<title>(.*?)<\/title>/);
    }
    
    if (!titleMatch) {
      return {
        success: false,
        errorMessage: "ERROR: Could not extract title from response."
      };
    }

    const title = titleMatch[1];

    return {
      success: true,
      videoId: videoId,
      title: title
    };

  } catch (error) {
    console.error("Error fetching video info:", error);
    return {
      success: false,
      errorMessage: "ERROR: Network or server error."
    };
  }
}