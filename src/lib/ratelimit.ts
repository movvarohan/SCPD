// Lightweight in-memory rate limiter (fixed window).
//
// Scope: best-effort abuse protection for authenticated API routes. It lives in
// process memory, so on a multi-instance/serverless deployment each instance
// keeps its own counters — adequate as a guardrail, not a hard quota. Swap in a
// shared store (Upstash/Redis) here if you need cross-instance limits.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

// Allow up to `limit` requests per `windowMs` for a given key.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, limit, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      limit,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - existing.count, limit, retryAfterSeconds: 0 };
}

// Build a 429 Response with the standard Retry-After header.
export function tooManyRequests(r: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests — slow down a moment." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(r.retryAfterSeconds),
        "X-RateLimit-Limit": String(r.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
