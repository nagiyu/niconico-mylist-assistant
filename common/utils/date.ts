/**
 * Date formatting utilities
 */

/**
 * Generate a timestamp-based title in the format CustomMylist_YYYYMMDD_HHMMSS
 */
export function generateTimestampTitle(prefix: string = "CustomMylist"): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  
  return `${prefix}_${y}${m}${d}_${hh}${mm}${ss}`;
}