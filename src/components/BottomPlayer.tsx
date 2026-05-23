"use client"

import React, { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Play, Pause, SkipForward, SkipBack, Heart, 
  Volume2, VolumeX, ListMusic, Shuffle, Repeat,
  Repeat1, Share2, Mic, Timer, X
} from "lucide-react"
import { usePlayerStore } from "@/store/usePlayerStore"
import toast from "react-hot-toast"
import { ShareModal } from "@/components/ShareLyrics"
import { SleepTimer } from "@/components/SettingsPanels"

type ActiveModal = null | "share" | "lyrics" | "sleep"

export default function BottomPlayer() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(0.8)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off")
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  const {
    currentSong, isPlaying, volume, currentTime, duration,
    isQueueOpen, isLyricsOpen, play, pause, next, prev, seek, setVolume,
    setQueueOpen, toggleLyrics, setAuthModalOpen,
    isRadioMode, setExpandedPlayerOpen,
  } = usePlayerStore()

  interface LikedSongItem {
    songId: string
  }

  const { data: likedSongs } = useQuery<LikedSongItem[]>({
    queryKey: ["likedSongs"],
    queryFn: async (): Promise<LikedSongItem[]> => {
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
          songId: currentSong.id, songName: currentSong.name,
          artist: currentSong.artist, image: currentSong.image,
          streamUrl: currentSong.streamUrl, duration: currentSong.duration,
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

  const handlePlayPause = () => isPlaying ? pause() : play()
  const handleLikeClick = () => session ? toggleLikeMutation.mutate() : setAuthModalOpen(true)
  const handleMuteToggle = () => {
    if (isMuted) { setVolume(prevVolume); setIsMuted(false) }
    else { setPrevVolume(volume); setVolume(0); setIsMuted(true) }
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
  const volumePercent = (isMuted ? 0 : volume) * 100

  const toggleModal = (m: ActiveModal) => setActiveModal(prev => prev === m ? null : m)

  return (
    <>
      {/* ── POPUP MODALS (Share / Sleep Timer) ── */}
      {activeModal && activeModal !== "lyrics" && (
        <div className="fixed bottom-[94px] left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h4 className="text-sm font-bold text-white">
                {activeModal === "share" ? "Share Song" : "Sleep Timer"}
              </h4>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 pb-5">
              {activeModal === "share" && <ShareModal onClose={() => setActiveModal(null)} />}
              {activeModal === "sleep" && <SleepTimer onClose={() => setActiveModal(null)} />}
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP MAIN PLAYER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 select-none hidden md:block" style={{ height: "var(--player-height)" }}>
        {/* Progress bar */}
        <div className="relative w-full" style={{ height: "3px" }}>
          <div className="absolute inset-0 bg-[#282828]" />
          <div
            className="absolute inset-y-0 left-0 bg-white"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range" min={0} max={duration || 100} value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Body */}
        <div
          className="flex items-center px-4 sm:px-6 gap-3"
          style={{
            height: "calc(var(--player-height) - 3px)",
            background: "rgba(10,10,15,0.97)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* LEFT: Track info */}
          <div className="flex items-center gap-3 min-w-0 w-[30%]">
            <div 
              className="relative flex-shrink-0 cursor-pointer group/cover"
              onClick={() => setExpandedPlayerOpen(true)}
              title="View Song Details"
            >
              <img src={currentSong.image} alt={currentSong.name}
                className="w-14 h-14 rounded-md object-cover shadow-lg transition-transform duration-300 group-hover/cover:scale-105" />
              {isPlaying && (
                <div className="absolute inset-0 rounded-md border border-[#6C63FF44]" />
              )}
            </div>
            <div 
              className="min-w-0 flex-1 cursor-pointer group/details"
              onClick={() => setExpandedPlayerOpen(true)}
              title="View Song Details"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate max-w-[160px] group-hover/details:text-[#6C63FF] transition-colors">{currentSong.name}</p>
                {isRadioMode && (
                  <span className="px-1.5 py-0.5 rounded bg-[#FF6584] text-[9px] font-extrabold text-white leading-none tracking-wider uppercase flex-shrink-0">
                    Radio
                  </span>
                )}
              </div>
              <p className="text-xs text-[#B3B3B3] truncate group-hover/details:text-white/80 transition-colors">{currentSong.artist}</p>
            </div>
            <button onClick={handleLikeClick}
              className={`p-2 rounded-full flex-shrink-0 transition-all hover:scale-110 ${isLiked ? "text-[#6C63FF]" : "text-[#B3B3B3] hover:text-white"}`}>
              <Heart size={16} className={isLiked ? "fill-[#6C63FF]" : ""} />
            </button>
          </div>

          {/* CENTER: Controls */}
          <div className="flex flex-col items-center justify-center flex-1 gap-1.5 max-w-[40%]">
            <div className="flex items-center gap-5">
              <button onClick={() => setIsShuffled(!isShuffled)}
                className={`transition-all hover:scale-110 ${isShuffled ? "text-[#6C63FF]" : "text-[#B3B3B3] hover:text-white"}`}>
                <Shuffle size={16} />
              </button>
              <button onClick={prev} className="text-[#B3B3B3] hover:text-white transition-all hover:scale-110 active:scale-90">
                <SkipBack size={20} />
              </button>
              <button onClick={handlePlayPause}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg">
                {isPlaying ? <Pause size={18} className="fill-black" /> : <Play size={18} className="fill-black ml-0.5" />}
              </button>
              <button onClick={next} className="text-[#B3B3B3] hover:text-white transition-all hover:scale-110 active:scale-90">
                <SkipForward size={20} />
              </button>
              <button
                onClick={() => setRepeatMode(m => m === "off" ? "all" : m === "all" ? "one" : "off")}
                className={`transition-all hover:scale-110 ${repeatMode !== "off" ? "text-[#6C63FF]" : "text-[#B3B3B3] hover:text-white"}`}>
                {repeatMode === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 w-full text-[10px] text-[#B3B3B3] font-medium">
              <span className="tabular-nums w-8 text-right">{formatTime(currentTime)}</span>
              <div className="relative flex-1 h-1 group cursor-pointer">
                <div className="absolute inset-0 rounded-full bg-[#282828]" />
                <div className="absolute inset-y-0 left-0 rounded-full bg-white group-hover:bg-[#6C63FF] transition-colors"
                  style={{ width: `${progressPercent}%` }} />
                <input type="range" min={0} max={duration || 100} value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <span className="tabular-nums w-8">{formatTime(duration)}</span>
            </div>
          </div>

          {/* RIGHT: Extra actions + volume */}
          <div className="flex items-center justify-end gap-2 w-[30%]">
            {/* EQ animation */}
            {isPlaying && (
              <div className="eq-container hidden sm:flex">
                <span className="eq-bar-1" /><span className="eq-bar-2" />
                <span className="eq-bar-3" /><span className="eq-bar-4" />
              </div>
            )}

            {/* Lyrics */}
            <button
              onClick={toggleLyrics}
              title="Lyrics"
              className={`p-2 rounded transition-all ${isLyricsOpen ? "text-[#6C63FF]" : "text-[#B3B3B3] hover:text-white"}`}>
              <Mic size={16} />
            </button>

            {/* Share */}
            <button
              onClick={() => toggleModal("share")}
              title="Share"
              className={`p-2 rounded transition-all ${activeModal === "share" ? "text-[#6C63FF]" : "text-[#B3B3B3] hover:text-white"}`}>
              <Share2 size={16} />
            </button>

            {/* Sleep Timer */}
            <button
              onClick={() => toggleModal("sleep")}
              title="Sleep Timer"
              className={`p-2 rounded transition-all ${activeModal === "sleep" ? "text-[#6C63FF]" : "text-[#B3B3B3] hover:text-white"}`}>
              <Timer size={16} />
            </button>

            {/* Queue */}
            <button onClick={() => setQueueOpen(!isQueueOpen)}
              className={`p-2 rounded transition-all ${isQueueOpen ? "text-[#6C63FF]" : "text-[#B3B3B3] hover:text-white"}`}
              title="Queue">
              <ListMusic size={18} />
            </button>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2">
              <button onClick={handleMuteToggle} className="p-1 text-[#B3B3B3] hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <div className="relative w-20 h-1 group cursor-pointer">
                <div className="absolute inset-0 rounded-full bg-[#282828]" />
                <div className="absolute inset-y-0 left-0 rounded-full bg-[#B3B3B3] group-hover:bg-[#6C63FF] transition-colors"
                  style={{ width: `${volumePercent}%` }} />
                <input type="range" min={0} max={1} step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false) }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE MINI PLAYER (64px, fixed above bottom nav 56px) ── */}
      <div
        className="fixed left-0 right-0 z-30 select-none md:hidden flex flex-col"
        style={{
          bottom: "calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom, 0px))",
          height: "64px",
          background: "rgba(18,18,30,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Slim progress bar at very top of mini player */}
        <div className="w-full h-[2px] bg-white/10 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Content row */}
        <div className="flex items-center flex-1 px-3 gap-3">
          {/* Tap cover or text → open full-screen expanded player */}
          <div
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            onClick={() => setExpandedPlayerOpen(true)}
          >
            <img
              src={currentSong.image}
              alt={currentSong.name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/5 shadow-md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white truncate leading-tight max-w-[160px]">
                  {currentSong.name}
                </p>
                {isRadioMode && (
                  <span className="px-1 py-0.5 rounded bg-[#FF6584] text-[7px] font-extrabold text-white leading-none tracking-wider uppercase flex-shrink-0">
                    Radio
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#B3B3B3] truncate mt-0.5">{currentSong.artist}</p>
            </div>
          </div>

          {/* Right: Play/Pause + Next buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all active:scale-90 shadow-lg"
            >
              {isPlaying
                ? <Pause size={16} className="fill-black" />
                : <Play size={16} className="fill-black ml-0.5" />}
            </button>
            <button
              onClick={next}
              className="w-10 h-10 flex items-center justify-center text-white/60 active:scale-90 transition-transform"
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
