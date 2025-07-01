import { getServerSession } from "next-auth/next";
import { authOptions } from "./authOptions";

/**
 * セッションからGoogleアクセストークンを取得し、ユーザーIDを取得
 * Get Google user ID from session using access token
 */
export async function getGoogleUserIdFromSession(): Promise<string> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log("[Auth] No session found");
      return "";
    }
    
    if (!session.tokens || !Array.isArray(session.tokens)) {
      console.log("[Auth] No tokens array in session");
      return "";
    }
    
    const accessToken = session.tokens.find(t => t.provider === "google")?.accessToken;
    if (!accessToken) {
      console.log("[Auth] No Google access token found in session");
      return "";
    }
    
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
      console.error("[Auth] Google userinfo API error:", res.status, res.statusText);
      return "";
    }
    
    const data = await res.json();
    
    if (!data.sub) {
      console.error("[Auth] No user ID in Google userinfo response");
      return "";
    }
    
    return data.sub;
  } catch (error) {
    console.error("[Auth] Error in getGoogleUserIdFromSession:", error);
    return "";
  }
}