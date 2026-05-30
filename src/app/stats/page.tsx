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
    <div className="min-h-screen bg-[#080810] text-white flex flex-col p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 -left-36 w-96 h-96 bg-[#6C63FF]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-36 w-96 h-96 bg-[#FF6584]/10 rounded-full blur-[150px] pointer-events-none" />

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
            background: "linear-gradient(135deg, #121222 0%, #0b0b14 50%, #080810 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Decorative top line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
          {/* Ambient glow blobs inside card */}
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "rgba(108,99,255,0.08)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: "160px", height: "160px", background: "rgba(255,101,132,0.06)", borderRadius: "50%", filter: "blur(50px)", pointerEvents: "none" }} />

          {/* Top: Branding row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
            <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", background: "linear-gradient(90deg, #6C63FF, #FF6584)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Tunely Streak
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "4px 10px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FF6584", display: "inline-block" }} />
              <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Live</span>
            </div>
          </div>

          {/* Middle: Main Metric */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", zIndex: 1 }}>
            {/* Flame icon box */}
            <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "linear-gradient(135deg, #6C63FF, #FF6584)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(108,99,255,0.25)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M12.5 0.75C12.5 0.75 13 5.25 11 7.5C9 9.75 6 10.5 6 13.5C6 16.5 8.25 19.5 12 19.5C15.75 19.5 18 16.5 18 13.5C18 10.5 15 9 15 6C15 4.5 15.75 3 12.5 0.75Z" />
                <path d="M12 15.75C12 15.75 10.5 15 10.5 13.5C10.5 12 12 11.25 12 11.25C12 11.25 13.5 12 13.5 13.5C13.5 15 12 15.75 12 15.75Z" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>

            <div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", fontWeight: 600, marginBottom: "4px" }}>Your listening streak</p>
              <p style={{ fontSize: "48px", fontWeight: 900, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {streakDays}
              </p>
              <p style={{ fontSize: "24px", fontWeight: 900, background: "linear-gradient(90deg, #6C63FF, #8C85FF, #FF6584)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.2 }}>
                {streakDays === 1 ? "Day" : "Days"} Streak 🔥
              </p>
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500, lineHeight: 1.5 }}>
              You&apos;re on fire! Keep spinning tracks to keep the vibe alive.
            </p>
          </div>

          {/* Bottom: Stats */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "16px", zIndex: 1 }}>
            {/* Quick stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                  🗓 Today
                </p>
                <p style={{ fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>{todayCount} Songs</p>
              </div>
              <div>
                <p style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                  📈 Weekly Spins
                </p>
                <p style={{ fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>{weeklyTotal} Songs</p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Daily Goal</span>
                <span style={{ fontSize: "9px", color: "#6C63FF", fontWeight: 800 }}>{todayCount}/10 songs</span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #6C63FF, #FF6584)", borderRadius: "999px", transition: "width 0.5s ease" }} />
              </div>
            </div>

            {/* Top Artists */}
            <div>
              <p style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", marginBottom: "10px" }}>🎵 Top Vibing Artists</p>
              {topArtists.length === 0 ? (
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>No artists yet. Start spinning!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {topArtists.map((art, idx) => (
                    <div key={art.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 900, color: idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : "#CD7F32" }}>#{idx + 1}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.88)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{art.name}</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{art.count} plays</span>
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
          className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:scale-105 transition-transform text-sm font-bold text-white rounded-full shadow-lg shadow-[#6C63FF]/30 active:scale-95"
        >
          <Download size={16} /> Download Tunely Streak Card
        </button>

        <p className="text-[10px] text-gray-600 font-medium text-center max-w-xs">
          Share your listening streak on socials ✨
        </p>
      </div>
    </div>
  )
}
