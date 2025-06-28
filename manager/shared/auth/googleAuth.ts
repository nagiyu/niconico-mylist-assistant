import { getServerSession } from "next-auth/next";
import { authOptions } from "./authOptions";

/**
 * セッションからGoogleアクセストークンを取得し、ユーザーIDを取得
 * Get Google user ID from session using access token
 */
export async function getGoogleUserIdFromSession(): Promise<string> {
  const session = await getServerSession(authOptions);
  const accessToken = session?.tokens?.find(t => t.provider === "google")?.accessToken;
  if (!accessToken) return "";
  
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) return "";
  const data = await res.json();
  return data.sub || "";
}