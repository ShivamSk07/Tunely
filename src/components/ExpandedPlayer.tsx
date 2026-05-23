"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  ChevronDown, Play, Pause, SkipForward, SkipBack, Heart, 
  Volume2, VolumeX, Calendar, Clock, Globe, Plus, Sparkles,
  MoreHorizontal, Mic, ListMusic, Share2, Shuffle, Repeat, Repeat1
} from "lucide-react"
import { usePlayerStore } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

export default function ExpandedPlayer() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(0.8)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off")

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartTime = useRef<number>(0)
  const swipeThreshold = 60
  const swipeTimeLimit = 400

  const {
    currentSong,
    isPlaying,
    volume,
    currentTime,
    duration,
    isExpandedPlayerOpen,
    setExpandedPlayerOpen,
    play,
    pause,
    next,
    prev,
    seek,
    setVolume,
    toggleLyrics,
    setQueueOpen,
    isQueueOpen,
  } = usePlayerStore()

  interface LikedSongData {
    songId: string
  }

  const { data: likedSongs } = useQuery<LikedSongData[]>({
    queryKey: ["likedSongs"],
    queryFn: async () => {
      const res = await fetch("/api/library/likes")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session && !!currentSong,
  })

  const isLiked = likedSongs?.some((ls) => ls.songId === currentSong?.id) || false

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!currentSong) return
      const res = await fetch("/api/library/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: currentSong.id,
          songName: currentSong.name,
          artist: currentSong.artist,
          image: currentSong.image,
          streamUrl: currentSong.streamUrl,
          duration: currentSong.duration,
        }),
      })
      if (!res.ok) throw new Error("Failed to toggle like")
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["likedSongs"] })
      toast.success(data.liked ? "Added to Liked Songs" : "Removed from Liked Songs")
    },
    onError: () => toast.error("Could not update library"),
  })

  if (!currentSong) return null

  const handlePlayPause = () => (isPlaying ? pause() : play())
  const handleLikeClick = () => (session ? toggleLikeMutation.mutate() : toast.error("Please login to like songs"))

  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
  const volumePercent = (isMuted ? 0 : volume) * 100

  const handleAddToPlaylist = () => {
    const event = new CustomEvent("trigger-add-to-playlist", { detail: currentSong })
    window.dispatchEvent(event)
  }

  // ── SWIPE GESTURE HANDLERS ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dt = Date.now() - touchStartTime.current
    if (dt > swipeTimeLimit) { touchStartX.current = null; touchStartY.current = null; return }
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (absDy > absDx && absDy > swipeThreshold && dy > 0) {
      // Swipe down → collapse
      setExpandedPlayerOpen(false)
    } else if (absDx > absDy && absDx > swipeThreshold) {
      if (dx < 0) {
        next() // Swipe left → next
      } else {
        prev() // Swipe right → prev
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col bg-[#06060A] select-none transition-all duration-[750ms] ${
        isExpandedPlayerOpen 
          ? "translate-y-0 opacity-100 pointer-events-auto" 
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-x" }}
    >
      {/* ── IMMERSIVE BACKDROP ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div 
          className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] bg-cover bg-center blur-[100px] opacity-40 scale-105 animate-[spin_80s_linear_infinite]"
          style={{ backgroundImage: `url(${currentSong.image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06060A]/80 via-[#06060A]/95 to-[#06060A]" />
      </div>

      {/* ── HEADER PANEL ── */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-white/5 backdrop-blur-md bg-black/10 flex-shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <button 
          onClick={() => setExpandedPlayerOpen(false)}
          className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/10 transition-all hover:scale-105 active:scale-95"
          title="Minimize Player"
        >
          <ChevronDown size={22} />
        </button>

        <div className="text-center min-w-0 flex-1 px-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6584]">PLAYING FROM QUEUE</p>
          <p className="text-xs font-bold text-white/80 truncate max-w-[200px] mx-auto mt-0.5">{currentSong.name}</p>
        </div>

        <button
          onClick={handleAddToPlaylist}
          className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center border border-white/10 transition-all active:scale-95"
          title="More options"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* ── DESKTOP LAYOUT (side-by-side) ── */}
      <div className="hidden md:flex flex-1 overflow-y-auto no-scrollbar items-center justify-center p-6 sm:p-10 md:p-14">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-10 md:gap-16">
          
          {/* LEFT: Cover art */}
          <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
            <div className="relative aspect-square w-64 sm:w-80 md:w-[400px] max-w-full rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/10 group">
              <img 
                src={currentSong.image} 
                alt={currentSong.name} 
                className={`w-full h-full object-cover transition-transform duration-[4000ms] ${
                  isPlaying ? "scale-105" : "scale-100"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className={`absolute inset-0 rounded-2xl border-2 transition-all duration-1000 ${
                isPlaying ? "border-[#6C63FF]/30 animate-pulse" : "border-white/5"
              }`} />
            </div>
          </div>

          {/* RIGHT: Controls */}
          <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6 md:space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/30 text-[9px] font-extrabold text-[#8B85FF] uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={9} className="animate-pulse" /> Tunely HD
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-extrabold text-white/50 uppercase tracking-widest">
                  320kbps AAC
                </span>
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-none tracking-tight truncate drop-shadow-md">
                  {currentSong.name}
                </h2>
                <p className="text-base sm:text-lg font-bold text-[#FF6584] uppercase tracking-wider">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
              <div className="flex flex-col justify-center text-xs text-white/70 bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl border border-white/5 transition-colors">
                <span className="text-[8px] uppercase tracking-widest text-white/30 font-extrabold flex items-center gap-1 mb-1">
                  <Calendar size={10} className="text-[#6C63FF]" /> Year
                </span>
                <span className="font-bold text-white">{currentSong.year || "N/A"}</span>
              </div>
              <div className="flex flex-col justify-center text-xs text-white/70 bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl border border-white/5 transition-colors">
                <span className="text-[8px] uppercase tracking-widest text-white/30 font-extrabold flex items-center gap-1 mb-1">
                  <Globe size={10} className="text-[#FF6584]" /> Plays
                </span>
                <span className="font-bold text-white">
                  {typeof currentSong.playCount === 'number' ? currentSong.playCount.toLocaleString() : currentSong.playCount || "N/A"}
                </span>
              </div>
              <div className="flex flex-col justify-center text-xs text-white/70 bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl border border-white/5 transition-colors">
                <span className="text-[8px] uppercase tracking-widest text-white/30 font-extrabold flex items-center gap-1 mb-1">
                  <Clock size={10} className="text-[#6C63FF]" /> Length
                </span>
                <span className="font-bold text-white">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="relative w-full h-1.5 group cursor-pointer">
                  <div className="absolute inset-0 rounded-full bg-white/10" />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584]" style={{ width: `${progressPercent}%` }} />
                  <input type="range" min={0} max={duration || 100} value={currentTime}
                    onChange={(e) => seek(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40 font-black tracking-widest">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-8">
                <button onClick={handleLikeClick}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border border-white/5 hover:scale-105 active:scale-95 ${
                    isLiked ? "bg-[#6C63FF]/15 border-[#6C63FF]/30 text-[#6C63FF]" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}>
                  <Heart size={20} className={isLiked ? "fill-[#6C63FF]" : ""} />
                </button>
                <button onClick={prev}
                  className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all">
                  <SkipBack size={22} />
                </button>
                <button onClick={handlePlayPause}
                  className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-[1.04] active:scale-95 transition-all shadow-[0_12px_35px_rgba(255,255,255,0.15)]">
                  {isPlaying ? <Pause size={28} className="fill-black text-black" /> : <Play size={28} className="fill-black text-black ml-1.5" />}
                </button>
                <button onClick={next}
                  className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all">
                  <SkipForward size={22} />
                </button>
                <button onClick={handleAddToPlaylist}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all">
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-3 rounded-2xl">
                <button onClick={handleMuteToggle} className="text-white/60 hover:text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div className="relative flex-1 h-1 group cursor-pointer">
                  <div className="absolute inset-0 rounded-full bg-white/10" />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-[#6C63FF]" style={{ width: `${volumePercent}%` }} />
                  <input type="range" min={0} max={1} step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false) }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <span className="text-[10px] text-white/40 font-bold tabular-nums w-8 text-right">{Math.round(volumePercent)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE LAYOUT (full screen vertical) ── */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-5 pb-4 flex flex-col gap-6">
          
          {/* Cover art */}
          <div className="flex justify-center">
            <div
              className={`relative rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 transition-all duration-700 ${
                isPlaying ? "scale-100" : "scale-[0.95]"
              }`}
              style={{ width: "min(72vw, 280px)", height: "min(72vw, 280px)" }}
            >
              <img
                src={currentSong.image}
                alt={currentSong.name}
                className={`w-full h-full object-cover transition-transform duration-[4000ms] ${
                  isPlaying ? "scale-105" : "scale-100"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              {isPlaying && <div className="absolute inset-0 rounded-2xl border-2 border-[#6C63FF]/30 animate-pulse" />}
            </div>
          </div>

          {/* Song info row */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <h2 className="text-[22px] font-black text-white leading-tight truncate">{currentSong.name}</h2>
              <p className="text-sm text-white/60 font-medium truncate mt-0.5">{currentSong.artist}</p>
            </div>
            <button
              onClick={handleLikeClick}
              className={`w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90 ${
                isLiked ? "text-[#6C63FF]" : "text-white/40"
              }`}
            >
              <Heart size={22} className={isLiked ? "fill-[#6C63FF]" : ""} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="relative w-full h-1 cursor-pointer" style={{ height: "4px" }}>
              <div className="absolute inset-0 rounded-full bg-white/15" />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584]"
                style={{ width: `${progressPercent}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ height: "100%", touchAction: "none" }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/40 font-bold tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Shuffle / Prev / Play / Next / Repeat */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsShuffled(!isShuffled)}
              className={`w-11 h-11 flex items-center justify-center transition-all active:scale-90 ${
                isShuffled ? "text-[#6C63FF]" : "text-white/40"
              }`}
            >
              <Shuffle size={20} />
            </button>
            <button
              onClick={prev}
              className="w-11 h-11 flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <SkipBack size={26} />
            </button>
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              {isPlaying
                ? <Pause size={24} className="fill-black text-black" />
                : <Play size={24} className="fill-black text-black ml-1" />}
            </button>
            <button
              onClick={next}
              className="w-11 h-11 flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <SkipForward size={26} />
            </button>
            <button
              onClick={() => setRepeatMode(m => m === "off" ? "all" : m === "all" ? "one" : "off")}
              className={`w-11 h-11 flex items-center justify-center transition-all active:scale-90 ${
                repeatMode !== "off" ? "text-[#6C63FF]" : "text-white/40"
              }`}
            >
              {repeatMode === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <button onClick={handleMuteToggle} className="text-white/40 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="relative flex-1 cursor-pointer" style={{ height: "4px" }}>
              <div className="absolute inset-0 rounded-full bg-white/10" />
              <div className="absolute inset-y-0 left-0 rounded-full bg-[#6C63FF]" style={{ width: `${volumePercent}%` }} />
              <input
                type="range" min={0} max={1} step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false) }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ touchAction: "none" }}
              />
            </div>
            <Volume2 size={18} className="text-white/40" />
          </div>

          {/* Bottom row: Lyrics / Queue / Share */}
          <div className="flex items-center justify-around pb-2">
            <button
              onClick={() => { setExpandedPlayerOpen(false); setTimeout(() => toggleLyrics(), 200) }}
              className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] justify-center"
            >
              <Mic size={20} />
              <span className="text-[10px] font-semibold">Lyrics</span>
            </button>
            <button
              onClick={() => { setExpandedPlayerOpen(false); setTimeout(() => setQueueOpen(!isQueueOpen), 200) }}
              className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] justify-center"
            >
              <ListMusic size={20} />
              <span className="text-[10px] font-semibold">Queue</span>
            </button>
            <button
              onClick={handleAddToPlaylist}
              className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] justify-center"
            >
              <Share2 size={20} />
              <span className="text-[10px] font-semibold">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP FOOTER ── */}
      <div className="hidden md:block px-6 py-4 bg-black/10 border-t border-white/5 flex-shrink-0 text-center text-[10px] text-white/30 font-black tracking-widest uppercase">
        IMMERSIVE PLAYBACK ENVIRONMENT
      </div>
    </div>
  )
}
