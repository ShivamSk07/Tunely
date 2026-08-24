"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Flame, Calendar, Music, TrendingUp } from "lucide-react"
import toast from "react-hot-toast"

export default function StatsPage() {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  const [streakDays, setStreakDays] = useState(1)
  const [todayCount, setTodayCount] = useState(0)
  const [weeklyTotal, setWeeklyTotal] = useState(0)
  const [topArtists, setTopArtists] = useState<{ name: string; count: number }[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = JSON.parse(localStorage.getItem('streak_data') || '{}')
      setStreakDays(data.streakDays || 1)
      setTodayCount(data.todayCount || 0)

      const history = data.history || {}
      let weekSum = 0
      Object.values(history).forEach((val: any) => { weekSum += val })
      setWeeklyTotal(weekSum || data.todayCount || 0)

      const artists = data.artists || {}
      const sorted = Object.entries(artists)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]: any) => ({ name, count }))
      setTopArtists(sorted)
    }
  }, [])

  const handleDownload = async () => {
    if (!cardRef.current) return
    const shareToast = toast.loading("Generating your Tunely Streak card...")
    try {
      const html2canvas = (await import("html2canvas")).default

      // Force the card to a fixed pixel size for a clean, wrapped export
      const card = cardRef.current
      const originalStyle = card.getAttribute("style") || ""

      // Temporarily pin dimensions so html2canvas captures a perfect fixed-size canvas
      card.style.width = "400px"
      card.style.height = "533px"
      card.style.maxWidth = "none"
      card.style.minWidth = "400px"
      card.style.position = "relative"
      card.style.overflow = "hidden"

      const canvas = await html2canvas(card, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#080810",
        scale: 2,
        logging: false,
        width: 400,
        height: 533,
        windowWidth: 400,
        windowHeight: 533,
        foreignObjectRendering: false,
        removeContainer: true,
        imageTimeout: 10000,
        onclone: (clonedDoc) => {
          // Ensure all gradient text in the clone renders as solid fallback
          const gradientTexts = clonedDoc.querySelectorAll(".bg-clip-text")
          gradientTexts.forEach((el: any) => {
            el.style.webkitTextFillColor = "transparent"
            el.style.backgroundClip = "text"
          })
        }
      })

      // Restore original style
      card.setAttribute("style", originalStyle)

      const link = document.createElement("a")
      link.download = "tunely-streak.png"
      link.href = canvas.toDataURL("image/png", 1.0)
      link.click()

      toast.dismiss(shareToast)
      toast.success("Tunely Streak card downloaded!")
    } catch (err) {
      console.error("Export error:", err)
      toast.dismiss(shareToast)
      toast.error("Could not export card. Try again.")
    }
  }

  const progressPct = Math.min(100, (todayCount / 10) * 100)
  const rankColors = ["text-[#FFD700]", "text-[#C0C0C0]", "text-[#CD7F32]"]

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col p-4 md:p-8 select-none relative">
      {/* Header */}
      <div className="w-full max-w-md mx-auto mb-6 z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Back to Feed
        </button>
      </div>

      {/* Card + Button */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">

        {/* ── PRINTABLE STREAK CARD ── */}
        {/* NOTE: Keep all styles as inline where possible for html2canvas compatibility */}
        <div
          ref={cardRef}
          style={{
            width: "400px",
            maxWidth: "100%",
            aspectRatio: "3/4",
            background: "#12131c",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Decorative top line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} />

          {/* Top: Branding row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ffffff" }}>
              Tunely Stats
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "4px 10px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ffffff", display: "inline-block" }} />
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Insights</span>
            </div>
          </div>

          {/* Middle: Main Metric */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", zIndex: 1 }}>
            <div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Total Spins</p>
              <p style={{ fontSize: "48px", fontWeight: 800, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {weeklyTotal}
              </p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1.3, marginTop: "2px" }}>
                Tracks Played
              </p>
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontWeight: 400, lineHeight: 1.5 }}>
              Your personal listening activity across all your favorite artists and genres.
            </p>
          </div>

          {/* Bottom: Stats */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "16px", zIndex: 1 }}>
            {/* Quick stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>
                  Today
                </p>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>{todayCount} Songs</p>
              </div>
              <div>
                <p style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>
                  This Week
                </p>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>{weeklyTotal} Songs</p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Daily Target</span>
                <span style={{ fontSize: "9px", color: "#ffffff", fontWeight: 700 }}>{todayCount}/10 songs</span>
              </div>
              <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, height: "100%", background: "#ffffff", borderRadius: "999px", transition: "width 0.5s ease" }} />
              </div>
            </div>

            {/* Top Artists */}
            <div>
              <p style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>Top Artists</p>
              {topArtists.length === 0 ? (
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>No artists yet. Start listening!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {topArtists.map((art, idx) => (
                    <div key={art.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>#{idx + 1}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.88)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{art.name}</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{art.count} plays</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-7 py-3 bg-white hover:bg-white/90 transition-all text-xs font-bold uppercase tracking-wider text-black rounded-full shadow-md active:scale-95"
        >
          <Download size={15} /> Download Stats Card
        </button>

        <p className="text-[11px] text-white/40 font-medium text-center max-w-xs">
          Share your listening recap with your friends
        </p>
      </div>
    </div>
  )
}
