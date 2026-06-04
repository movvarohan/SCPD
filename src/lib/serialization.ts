// Helpers for the SQLite-friendly storage strategy:
//   - comma-separated strings for list fields
//   - JSON-encoded strings for structured blobs
// Keeping these in one place makes the eventual Postgres migration trivial.

export function listToString(list: string[] | undefined | null): string {
  if (!list) return "";
  return list
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

export function stringToList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function encodeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "null";
  }
}

export function decodeJson<T>(value: string | undefined | null, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}
