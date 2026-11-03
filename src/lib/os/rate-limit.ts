export const LOGIN_FAILURE_DELAY_MS = 1000;

type Bucket = { failures: number; windowStart: number; blockedUntil: number };

export class LoginLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxFailures = 5,
    private readonly windowMs = 10 * 60 * 1000,
    private readonly blockMs = 10 * 60 * 1000,
  ) {}

  check(key: string, now: number): { allowed: boolean; retryAfterSec: number } {
    const bucket = this.buckets.get(key);
    if (!bucket) return { allowed: true, retryAfterSec: 0 };
    if (bucket.blockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((bucket.blockedUntil - now) / 1000) };
    }
    if (now - bucket.windowStart > this.windowMs) {
      this.buckets.delete(key);
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  recordFailure(key: string, now: number): { blocked: boolean; retryAfterSec: number } {
    const existing = this.buckets.get(key);
    const fresh = !existing || now - existing.windowStart > this.windowMs;
    const bucket: Bucket = fresh
      ? { failures: 1, windowStart: now, blockedUntil: 0 }
      : { ...existing, failures: existing.failures + 1 };
    if (bucket.failures >= this.maxFailures) {
      bucket.blockedUntil = now + this.blockMs;
    }
    this.buckets.set(key, bucket);
    return {
      blocked: bucket.blockedUntil > now,
      retryAfterSec: bucket.blockedUntil > now ? Math.ceil(this.blockMs / 1000) : 0,
    };
  }

  recordSuccess(key: string): void {
    this.buckets.delete(key);
  }
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const raw = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
  return raw.slice(0, 80) || "unknown";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
