/**
 * Safely convert a Firestore timestamp value to epoch milliseconds.
 * Handles: plain number (epoch ms), Firestore Timestamp object ({seconds, nanoseconds}),
 * string (ISO 8601), or null/undefined.
 */
export function toEpochMs(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value).getTime();
  if (value && typeof value === "object" && "seconds" in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return 0;
}

/**
 * Format a timestamp as a human-readable "time ago" string.
 */
export function formatTimeAgo(value: unknown): string {
  const ms = toEpochMs(value);
  if (ms === 0) return "";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(ms).toLocaleDateString();
}
