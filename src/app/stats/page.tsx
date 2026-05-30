"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Share2, Flame, Calendar, Music, Sparkles, TrendingUp } from "lucide-react"
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
      
      // Calculate weekly total
      const history = data.history || {}
      let weekSum = 0
      Object.values(history).forEach((val: any) => {
        weekSum += val
      })
      setWeeklyTotal(weekSum || data.todayCount || 0)
      
      // Top 3 Artists
      const artists = data.artists || {}
      const sorted = Object.entries(artists)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]: any) => ({ name, count }))
      setTopArtists(sorted)
    }
  }, [])

  const handleShare = async () => {
    if (!cardRef.current) return
    const shareToast = toast.loading("Generating your high-res stats card...")
    try {
      const html2canvas = (await import("html2canvas")).default
      
      // Render canvas with retina scale and transparent CORS support
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: "#080810",
        scale: 2,
        logging: false
      })
      
      const link = document.createElement("a")
      link.download = `tunely-listening-streak.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      
      toast.dismiss(shareToast)
      toast.success("Card downloaded successfully!")
    } catch (err) {
      toast.dismiss(shareToast)
      console.error("Export error:", err)
      toast.error("Could not export stats card image.")
    }
  }

  return (
    <div className="min-y-full min-h-screen bg-[#080810] text-white flex flex-col p-4 md:p-8 select-none relative overflow-hidden">
      {/* Ambient neon decorative background blobs */}
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

      {/* Exporter Container with dynamic sizing */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
        {/* Printable Glassmorphic Card */}
        <div
          ref={cardRef}
          className="relative w-full max-w-sm aspect-[3/4] bg-gradient-to-br from-[#121222] via-[#0b0b14] to-[#080810] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden group"
        >
          {/* Accent glowing border lines inside print area */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Card Top: Branding */}
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest font-black text-transparent bg-clip-text bg-gradient-to-r from-[#6C63FF] to-[#FF6584]">
              TUNELY WRAPPED
            </span>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6584] animate-pulse" />
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-white/60">Streak Live</span>
            </div>
          </div>

          {/* Card Middle: Main Streak Metric */}
          <div className="space-y-3 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] flex items-center justify-center shadow-lg shadow-[#6C63FF]/20">
              <Flame size={36} className="text-white fill-white animate-bounce" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tight">
              {streakDays} Day<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C63FF] via-[#8C85FF] to-[#FF6584]">
                Streak
              </span>
            </h2>
            <p className="text-sm text-gray-400 font-medium">
              You are on fire! Keep spinning tracks to keep the vibe alive.
            </p>
          </div>

          {/* Card Details: Quick Stats */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Calendar size={10} /> Today
                </span>
                <p className="text-lg font-black text-white">{todayCount} Songs</p>
              </div>
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <TrendingUp size={10} /> Weekly Spins
                </span>
                <p className="text-lg font-black text-white">{weeklyTotal} Songs</p>
              </div>
            </div>

            {/* Top Artists Row */}
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Music size={10} /> Top Vibing Artists
              </span>
              {topArtists.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No artists listened to yet. Start spinning!</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {topArtists.map((art, idx) => (
                    <div key={art.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-extrabold text-[#6C63FF]">#{idx + 1}</span>
                        <span className="font-semibold text-white/90 truncate max-w-[150px]">{art.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold tabular-nums">{art.count} plays</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share Action Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:scale-105 transition-transform text-sm font-bold text-white rounded-full shadow-lg shadow-[#6C63FF]/30 active:scale-95"
        >
          <Share2 size={16} /> Download Share Card
        </button>
      </div>
    </div>
  )
}
