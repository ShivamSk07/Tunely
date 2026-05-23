"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Logo from "./Logo"
import { useAppStore } from "@/store/useAppStore"

export default function InitialPageLoader() {
  const isAppReady = useAppStore((s) => s.isAppReady)
  const setAppReady = useAppStore((s) => s.setAppReady)
  const pathname = usePathname()
  const [minTimePassed, setMinTimePassed] = useState(false)
  const [gone, setGone] = useState(false)

  // If we are not on the home page, set app ready immediately so the loader fades away fast
  useEffect(() => {
    if (pathname !== "/") {
      setAppReady()
    }
  }, [pathname, setAppReady])

  // Give the loader a minimum display time to ensure the intro slam plays
  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1500)
    return () => clearTimeout(t)
  }, [])

  // Dismiss only when BOTH min time has passed AND API is ready
  useEffect(() => {
    if (minTimePassed && isAppReady) {
      const t = setTimeout(() => setGone(true), 400)
      return () => clearTimeout(t)
    }
  }, [minTimePassed, isAppReady])

  // Safety net
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 8000)
    return () => clearTimeout(t)
  }, [])

  if (gone) return null

  const isFading = minTimePassed && isAppReady
  const letters = "TUNELY".split("")

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
      style={{
        opacity: isFading ? 0 : 1,
        transition: isFading ? "opacity 0.4s ease-in" : "none",
        pointerEvents: isFading ? "none" : "all",
      }}
    >
      {/* Netflix-style logo with continuous pulsing glow after slam */}
      <div className="netflix-logo-container">
        <Logo size={52} />
      </div>

      {/* Wordmark stagger */}
      <div className="flex mt-5 gap-[0.05em]">
        {letters.map((char, i) => (
          <span
            key={i}
            className="text-white font-black text-lg tracking-[0.3em] netflix-letter"
            style={{ animationDelay: `${0.35 + i * 0.06}s` }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* Animated dots that appear if the loader stays on screen */}
      <div className="mt-8 flex gap-2 loader-dots">
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 loader-dot" style={{ animationDelay: "0s" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 loader-dot" style={{ animationDelay: "0.2s" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 loader-dot" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  )
}
