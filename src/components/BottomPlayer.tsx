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
          <div className="bg-[#12131c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h4 className="text-sm font-bold text-white">
                {activeModal === "share" ? "Share Track" : "Sleep Timer"}
              </h4>
              <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
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

      {/* ── DESKTOP MAIN PLAYER (Spotify-inspired Obsidian Theme) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 select-none hidden md:block" style={{ height: "var(--player-height)" }}>
        {/* Top Hairline Track Progress Bar */}
        <div className="relative w-full group/scrubber cursor-pointer" style={{ height: "3px" }}>
          <div className="absolute inset-0 bg-white/10 group-hover/scrubber:h-[5px] transition-all" />
          <div
            className="absolute inset-y-0 left-0 bg-white group-hover/scrubber:h-[5px] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range" min={0} max={duration || 100} value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Player Body */}
        <div
          className="flex items-center px-4 sm:px-6 gap-4"
          style={{
            height: "calc(var(--player-height) - 3px)",
            background: "rgba(9, 10, 15, 0.98)",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* LEFT: Track Info & Artwork */}
          <div className="flex items-center gap-3.5 min-w-0 w-[30%]">
            <div 
              className="relative flex-shrink-0 cursor-pointer group/cover"
              onClick={() => setExpandedPlayerOpen(true)}
              title="Open full player"
            >
              <img 
                src={currentSong.image} 
                alt={currentSong.name}
                className="w-13 h-13 rounded-lg object-cover shadow-md border border-white/10 group-hover/cover:brightness-110 transition-all" 
              />
            </div>
            <div 
              className="min-w-0 flex-1 cursor-pointer group/details"
              onClick={() => setExpandedPlayerOpen(true)}
              title="Open full player"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate max-w-[180px] hover:underline transition-colors">
                  {currentSong.name}
                </p>
                {isRadioMode && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-bold text-white leading-none tracking-wider uppercase flex-shrink-0 border border-white/10">
                    Radio
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 truncate hover:text-white/80 transition-colors mt-0.5">
                {currentSong.artist}
              </p>
            </div>
            <button 
              onClick={handleLikeClick}
              className={`p-2 rounded-full flex-shrink-0 transition-all hover:scale-110 active:scale-95 ${
                isLiked ? "text-white" : "text-white/40 hover:text-white"
              }`}
              title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
            >
              <Heart size={17} className={isLiked ? "fill-white text-white" : ""} />
            </button>
          </div>

          {/* CENTER: Main Controls & Scrubber */}
          <div className="flex flex-col items-center justify-center flex-1 gap-1.5 max-w-[40%]">
            {/* Control buttons row */}
            <div className="flex items-center gap-5">
              <button 
                onClick={() => setIsShuffled(!isShuffled)}
                className={`transition-all hover:scale-110 relative ${isShuffled ? "text-white font-bold" : "text-white/40 hover:text-white"}`}
                title={isShuffled ? "Shuffle active" : "Shuffle"}
              >
                <Shuffle size={16} />
                {isShuffled && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
              </button>

              <button 
                onClick={prev} 
                className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-90"
                title="Previous track"
              >
                <SkipBack size={20} />
              </button>

              <button 
                onClick={handlePlayPause}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={17} className="fill-black" /> : <Play size={17} className="fill-black ml-0.5" />}
              </button>

              <button 
                onClick={next} 
                className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-90"
                title="Next track"
              >
                <SkipForward size={20} />
              </button>

              <button
                onClick={() => setRepeatMode(m => m === "off" ? "all" : m === "all" ? "one" : "off")}
                className={`transition-all hover:scale-110 relative ${repeatMode !== "off" ? "text-white font-bold" : "text-white/40 hover:text-white"}`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
                {repeatMode !== "off" && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
              </button>
            </div>

            {/* Time & Scrubber slider */}
            <div className="flex items-center gap-2.5 w-full text-[11px] text-white/40 font-medium">
              <span className="tabular-nums w-8 text-right select-none">{formatTime(currentTime)}</span>
              <div className="relative flex-1 h-1 group cursor-pointer">
                <div className="absolute inset-0 rounded-full bg-white/15 group-hover:bg-white/25 transition-colors" />
                <div 
                  className="absolute inset-y-0 left-0 rounded-full bg-white transition-colors"
                  style={{ width: `${progressPercent}%` }} 
                />
                <input 
                  type="range" min={0} max={duration || 100} value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </div>
              <span className="tabular-nums w-8 select-none">{formatTime(duration)}</span>
            </div>
          </div>

          {/* RIGHT: Extra actions + volume */}
          <div className="flex items-center justify-end gap-1.5 w-[30%]">
            {/* Visualizer animation when playing */}
            {isPlaying && (
              <div className="eq-container hidden lg:flex mr-2">
                <span className="eq-bar-1" /><span className="eq-bar-2" />
                <span className="eq-bar-3" /><span className="eq-bar-4" />
              </div>
            )}

            {/* Lyrics Button */}
            <button
              onClick={toggleLyrics}
              title="Lyrics"
              className={`p-2 rounded-lg transition-all relative ${isLyricsOpen ? "text-white bg-white/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <Mic size={16} />
            </button>

            {/* Share Button */}
            <button
              onClick={() => toggleModal("share")}
              title="Share Track"
              className={`p-2 rounded-lg transition-all ${activeModal === "share" ? "text-white bg-white/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <Share2 size={16} />
            </button>

            {/* Sleep Timer Button */}
            <button
              onClick={() => toggleModal("sleep")}
              title="Sleep Timer"
              className={`p-2 rounded-lg transition-all ${activeModal === "sleep" ? "text-white bg-white/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <Timer size={16} />
            </button>

            {/* Queue Button */}
            <button 
              onClick={() => setQueueOpen(!isQueueOpen)}
              className={`p-2 rounded-lg transition-all ${isQueueOpen ? "text-white bg-white/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}
              title="Queue"
            >
              <ListMusic size={17} />
            </button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <button onClick={handleMuteToggle} className="p-1.5 text-white/40 hover:text-white transition-colors" title="Mute/Unmute">
                {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <div className="relative w-20 h-1 group cursor-pointer">
                <div className="absolute inset-0 rounded-full bg-white/15 group-hover:bg-white/25 transition-colors" />
                <div 
                  className="absolute inset-y-0 left-0 rounded-full bg-white transition-colors"
                  style={{ width: `${volumePercent}%` }} 
                />
                <input 
                  type="range" min={0} max={1} step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false) }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE MINI PLAYER (Floating Obsidian Bar, 64px) ── */}
      <div
        className="fixed left-0 right-0 z-30 select-none md:hidden flex flex-col px-2"
        style={{
          bottom: "calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 6px)",
        }}
      >
        <div 
          className="w-full h-15 rounded-xl bg-[#10111a]/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden"
        >
          {/* Slim progress bar at very top */}
          <div className="w-full h-[2px] bg-white/10 flex-shrink-0">
            <div
              className="h-full bg-white transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Mini Player Content Row */}
          <div className="flex items-center flex-1 px-3 gap-3">
            {/* Tap cover or text → open full-screen expanded player */}
            <div
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              onClick={() => setExpandedPlayerOpen(true)}
            >
              <img
                src={currentSong.image}
                alt={currentSong.name}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10 shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white truncate leading-tight max-w-[160px]">
                    {currentSong.name}
                  </p>
                  {isRadioMode && (
                    <span className="px-1 py-0.5 rounded bg-white/10 text-[7px] font-bold text-white leading-none tracking-wider uppercase flex-shrink-0 border border-white/10">
                      Radio
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/50 truncate mt-0.5">{currentSong.artist}</p>
              </div>
            </div>

            {/* Like + Play/Pause + Next */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleLikeClick}
                className={`p-1.5 text-white/50 active:scale-90 transition-transform ${isLiked ? "text-white" : ""}`}
              >
                <Heart size={16} className={isLiked ? "fill-white text-white" : ""} />
              </button>

              <button
                onClick={handlePlayPause}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all active:scale-90 shadow-md"
              >
                {isPlaying
                  ? <Pause size={15} className="fill-black" />
                  : <Play size={15} className="fill-black ml-0.5" />}
              </button>

              <button
                onClick={next}
                className="p-1.5 text-white/60 active:scale-90 transition-transform"
              >
                <SkipForward size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
