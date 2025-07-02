import { useState } from "react";

interface UseVideoInfoResult {
  isLoading: boolean;
  error: string;
  fetchVideoInfo: (musicId: string) => Promise<string | null>;
}

/**
 * Custom hook for fetching video information from Niconico API
 */
export function useVideoInfo(): UseVideoInfoResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchVideoInfo = async (musicId: string): Promise<string | null> => {
    if (!musicId.trim()) {
      setError("IDを入力してください");
      return null;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/music/info?video_id=${encodeURIComponent(musicId.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video info");
      }

      if (data.status === "success" && data.title) {
        return data.title;
      } else {
        setError(data.message || "情報の取得に失敗しました");
        return null;
      }
    } catch (error) {
      console.error("Error fetching video info:", error);
      setError("情報の取得中にエラーが発生しました");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    fetchVideoInfo,
  };
}