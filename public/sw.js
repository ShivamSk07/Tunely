// Tunely Service Worker — offline caching for audio streams
const CACHE_NAME = "tunely-audio-v1"
const STATIC_CACHE = "tunely-static-v1"

// Static assets to pre-cache
const STATIC_ASSETS = [
  "/",
  "/search",
  "/library",
  "/settings",
]

// Install: pre-cache static pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch: serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Fast bypass for non-GET, non-http/https, and HMR development streams
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith("http") ||
    url.pathname.includes("webpack-hmr") ||
    url.pathname.includes("hot-update")
  ) {
    return
  }

  // Cache audio streams (jiosaavn CDN)
  const isAudio =
    url.hostname.includes("aac.saavncdn.com") ||
    url.hostname.includes("c.saavncdn.com") ||
    url.pathname.includes(".mp4") ||
    url.pathname.includes(".m4a")

  if (isAudio) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        try {
          const response = await fetch(event.request)
          if (response.ok && response.status === 200) {
            // Only cache full responses (not range requests)
            const cloned = response.clone()
            cache.put(event.request, cloned)
          }
          return response
        } catch {
          // Offline fallback
          return new Response("Audio unavailable offline", { status: 503 })
        }
      })
    )
    return
  }

  // For API calls: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          headers: { "Content-Type": "application/json" },
          status: 503,
        })
      )
    )
    return
  }

  // For everything else: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) =>
              cache.put(event.request, response.clone())
            )
          }
          return response
        })
        .catch(() => cached || new Response("Offline", { status: 503 }))

      return cached || networkFetch
    })
  )
})
