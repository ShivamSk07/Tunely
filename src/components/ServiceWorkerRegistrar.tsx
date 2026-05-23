"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("[Tunely SW] Registered:", reg.scope))
          .catch((err) => console.warn("[Tunely SW] Registration failed:", err))
      } else {
        // Automatically unregister service workers in development mode to prevent caching/hydration issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("[Tunely SW] Stale Dev Service Worker successfully unregistered.")
              }
            })
          }
        })

        // Also clear cache storage to avoid stale assets in development
        if ("caches" in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              caches.delete(key).then(() => {
                console.log(`[Tunely SW] Cleared dev cache: ${key}`)
              })
            })
          })
        }
      }
    }
  }, [])
  return null
}
