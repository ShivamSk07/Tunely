import { NextResponse } from "next/server"

/**
 * Returns a JSON response with standard cache-control headers.
 * Use for public, non-user-specific API responses that can be cached
 * at the CDN/browser level for 5 minutes (stale-while-revalidate 10 min).
 */
export function jsonCached(data: unknown, maxAge = 300, swr = 600) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
    },
  })
}
