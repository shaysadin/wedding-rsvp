import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter (for serverless, use Redis in production for better scaling)
// This works per-instance, so in a multi-instance setup, consider using Upstash Redis

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory (per-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  limit: number;
  // Time window in seconds
  windowInSeconds: number;
}

// Preset configurations for different use cases
export const RATE_LIMIT_PRESETS = {
  // Standard API endpoints - 100 requests per minute
  api: { limit: 100, windowInSeconds: 60 },
  // Auth endpoints (login, register) - 10 requests per minute
  auth: { limit: 10, windowInSeconds: 60 },
  // Sensitive operations (password reset, etc.) - 5 requests per minute
  sensitive: { limit: 5, windowInSeconds: 60 },
  // Bulk operations - 5 requests per minute
  bulk: { limit: 5, windowInSeconds: 60 },
  // Webhook endpoints - 200 requests per minute
  webhook: { limit: 200, windowInSeconds: 60 },
  // Public RSVP page - 30 requests per minute per IP
  rsvp: { limit: 30, windowInSeconds: 60 },
} as const;

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { isLimited: boolean; remaining: number; resetIn: number } {
  cleanupOldEntries();

  const now = Date.now();
  const windowMs = config.windowInSeconds * 1000;
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // First request or window expired - create new entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      isLimited: false,
      remaining: config.limit - 1,
      resetIn: config.windowInSeconds,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(identifier, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);

  return {
    isLimited: entry.count > config.limit,
    remaining,
    resetIn,
  };
}

/**
 * Get client identifier from request (IP address or forwarded IP)
 */
export function getClientIdentifier(request: NextRequest): string {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(",")[0].trim();
  }

  // Check for real IP header (Cloudflare, etc.)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (in development)
  return "127.0.0.1";
}

/**
 * Create a rate-limited response
 */
export function rateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      message: `Rate limit exceeded. Please try again in ${resetIn} seconds.`,
      retryAfter: resetIn,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetIn),
        "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + resetIn),
      },
    }
  );
}

/**
 * Rate limit middleware for API routes
 * Usage in route.ts:
 *
 * import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
 *
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = withRateLimit(request, RATE_LIMIT_PRESETS.api);
 *   if (rateLimitResult) return rateLimitResult;
 *   // ... rest of handler
 * }
 */
export function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  customIdentifier?: string
): NextResponse | null {
  const identifier = customIdentifier || getClientIdentifier(request);
  const key = `${request.nextUrl.pathname}:${identifier}`;

  const result = checkRateLimit(key, config);

  if (result.isLimited) {
    return rateLimitResponse(result.resetIn);
  }

  return null;
}

/**
 * Rate limit check for server actions
 * Returns true if the request should be blocked
 *
 * Usage in server action:
 *
 * import { isRateLimited, RATE_LIMIT_PRESETS } from "@/lib/rate-limit";
 *
 * export async function myAction() {
 *   if (isRateLimited("myAction", "user-id-or-ip", RATE_LIMIT_PRESETS.api)) {
 *     return { error: "Too many requests. Please try again later." };
 *   }
 *   // ... rest of action
 * }
 */
export function isRateLimited(
  actionName: string,
  identifier: string,
  config: RateLimitConfig
): boolean {
  const key = `action:${actionName}:${identifier}`;
  const result = checkRateLimit(key, config);
  return result.isLimited;
}
