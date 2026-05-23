"use client"

import { useEffect } from "react"
import { usePlayerStore } from "@/store/usePlayerStore"

/**
 * Global keyboard shortcuts (mounted once in layout):
 * - Space       → Play / Pause
 * - Ctrl+→      → Next song
 * - Ctrl+←      → Previous song
 * - M           → Mute / Unmute
 * - F           → Open expanded player
 */
export default function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()

      // Skip when user is typing in any input/textarea/contenteditable
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      ) return

      const store = usePlayerStore.getState()

      switch (e.code) {
        case "Space":
          e.preventDefault() // Prevent page scroll
          store.isPlaying ? store.pause() : store.play()
          break

        case "ArrowRight":
          if (e.altKey || e.ctrlKey || e.metaKey) {
            e.preventDefault()
            store.next()
          }
          break

        case "ArrowLeft":
          if (e.altKey || e.ctrlKey || e.metaKey) {
            e.preventDefault()
            store.prev()
          }
          break

        case "KeyM": {
          if (!e.ctrlKey && !e.metaKey) {
            // Toggle mute
            const vol = store.volume
            store.setVolume(vol > 0 ? 0 : 0.8)
          }
          break
        }

        case "KeyF":
          if (!e.ctrlKey && !e.metaKey && store.currentSong) {
            store.setExpandedPlayerOpen(true)
          }
          break
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, []) // No deps — reads from Zustand store directly via .getState()

  return null
}
