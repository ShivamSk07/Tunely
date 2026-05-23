"use client"

import React, { useState, useEffect, useRef } from "react"
import { AlertCircle, Music, Play, Sparkles, ListMusic, Minimize2, ChevronDown } from "lucide-react"
import { Song, usePlayerStore } from "@/store/usePlayerStore"
import { useQuery } from "@tanstack/react-query"

interface SyncedLine {
  time: number // in seconds
  text: string
}

type Mode = "live" | "classic"

interface LyricsContentProps {
  currentSong: Song
  isPlaying: boolean
  toggleLyrics: () => void
}

function LyricsContent({ currentSong, isPlaying, toggleLyrics }: LyricsContentProps) {
  const currentTime = usePlayerStore((state) => state.currentTime)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const lyricsCache = usePlayerStore((state) => state.lyricsCache)
  const prefetchLyrics = usePlayerStore((state) => state.prefetchLyrics)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null)
  const [syncedLines, setSyncedLines] = useState<SyncedLine[]>([])
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1)
  const [mode, setMode] = useState<Mode>("live")

  interface RecSongData {
    id: string
    name: string
    artist?: string
    image?: string
    streamUrl?: string
    duration?: number
  }

  // Fetch similar songs for recommendations panel
  const { data: recSongs } = useQuery<RecSongData[]>({
    queryKey: ["songRecommend", currentSong?.id],
    queryFn: async () => {
      const res = await fetch(`/api/song/recommend?id=${currentSong.id}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    },
    enabled: !!currentSong?.id,
  })

  const handlePlayRecommendedSong = (song: RecSongData) => {
    setQueue([{
      id: song.id,
      name: song.name,
      artist: song.artist || "Unknown Artist",
      image: song.image || "",
      streamUrl: song.streamUrl || "",
      duration: song.duration || 180,
    }], 0)
  }

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)

  // 1. Parse LRC format ([mm:ss.xx] text) to SyncedLine array
  const parseLRC = (lrcText: string): SyncedLine[] => {
    if (!lrcText) return []
    const lines = lrcText.split(/\r?\n/)
    const parsed: SyncedLine[] = []
    
    // Support spaces, dots, and commas in time formats like [02:15.30] or [02:15,30]
    const timeRegex = /\[\s*(\d+)\s*:\s*(\d+)\s*(?:[.,]\s*(\d+)\s*)?\]/

    for (const rawLine of lines) {
      const match = timeRegex.exec(rawLine)
      if (match) {
        const minutes = parseInt(match[1], 10)
        const seconds = parseInt(match[2], 10)
        const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) : 0
        const totalSeconds = minutes * 60 + seconds + milliseconds / 1000

        // Clean all brackets from text
        const text = rawLine.replace(timeRegex, "").trim()
        if (text || parsed.length > 0) {
          parsed.push({ time: totalSeconds, text })
        }
      }
    }
    return parsed.sort((a, b) => a.time - b.time)
  }

  // 2a. Reactively consume lyricsCache whenever it updates for the current song
  useEffect(() => {
    if (!currentSong) return
    const songId = currentSong.id
    const cached = lyricsCache?.[songId]
    if (!cached) return

    setPlainLyrics(cached.plain)
    if (cached.synced) {
      const parsed = parseLRC(cached.synced)
      setSyncedLines(parsed)
      setMode(parsed.length > 0 ? "live" : "classic")
    } else {
      setSyncedLines([])
      setMode("classic")
    }
    setLoading(false)
    setError(!cached.plain && !cached.synced)
  }, [currentSong, lyricsCache]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2b. Trigger fetch when song changes (only if not already in cache)
  useEffect(() => {
    if (!currentSong) return
    const songId = currentSong.id

    // Already cached — reactive effect above will handle it
    if (lyricsCache?.[songId]) return

    // Reset state for new song
    setLoading(true)
    setError(false)
    setPlainLyrics(null)
    setSyncedLines([])
    setActiveLineIndex(-1)

    prefetchLyrics(currentSong).catch((err) => {
      console.error("Lyrics fetch failed:", err)
      setError(true)
      setLoading(false)
    })
  }, [currentSong]) // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Highlight current line in sync with currentTime
  useEffect(() => {
    if (syncedLines.length === 0 || mode !== "live") return

    let activeIdx = -1
    for (let i = 0; i < syncedLines.length; i++) {
      if (currentTime >= syncedLines[i].time) {
        activeIdx = i
      } else {
        break
      }
    }

    if (activeIdx !== activeLineIndex) {
      setActiveLineIndex(activeIdx)
    }
  }, [currentTime, syncedLines, activeLineIndex, mode])

  // 4. Smooth auto-scroll to the active line (centered in viewport)
  useEffect(() => {
    if (activeLineIndex === -1 || !scrollContainerRef.current || !activeLineRef.current || mode !== "live") return

    const container = scrollContainerRef.current
    const activeElement = activeLineRef.current

    const containerHeight = container.clientHeight
    const elementTop = activeElement.offsetTop
    const elementHeight = activeElement.clientHeight

    // Scroll centered
    const targetScrollTop = elementTop - containerHeight / 2 + elementHeight / 2

    container.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    })
  }, [activeLineIndex, mode])

  const formatLrcTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  return (
    <>
      {/* ── PREMIUM HEADER (Center title, floating control widgets) ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-sm border-b border-white/5 flex-shrink-0 relative z-10">
        {/* Left Side: Back Button (Mobile) & Track details */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button
            onClick={toggleLyrics}
            className="md:hidden w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center border border-white/10 flex-shrink-0"
            title="Go Back"
          >
            <ChevronDown size={20} />
          </button>

          {currentSong && (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentSong.image}
                alt={currentSong.name}
                className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover border border-white/10 shadow-2xl scale-100 hover:scale-105 transition-transform duration-300 flex-shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-black text-white truncate text-sm md:text-base leading-none tracking-tight">{currentSong.name}</h4>
                <p className="text-[10px] md:text-xs text-white/60 truncate mt-1 md:mt-1.5 font-bold tracking-wide uppercase">{currentSong.artist}</p>
              </div>
            </div>
          )}
        </div>

        {/* Center: Mode Tabs */}
        {syncedLines.length > 0 && !loading && !error && (
          <div className="hidden md:flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-lg">
            <button
              onClick={() => setMode("live")}
              className={`px-6 py-1.5 rounded-full text-xs font-black transition-all duration-300 flex items-center gap-2 ${
                mode === "live"
                  ? "bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-lg shadow-[#6C63FF33]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Sparkles size={13} /> Synced Live
            </button>
            <button
              onClick={() => setMode("classic")}
              className={`px-6 py-1.5 rounded-full text-xs font-black transition-all duration-300 flex items-center gap-2 ${
                mode === "classic"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <ListMusic size={13} /> Classic Text
            </button>
          </div>
        )}

        {/* Right side: Exit Button */}
        <div className="flex items-center gap-3">
          {isPlaying && (
            <div className="eq-container flex-shrink-0 scale-100 hidden sm:flex mr-4">
              <span className="eq-bar-1 bg-[#6C63FF]" />
              <span className="eq-bar-2 bg-[#FF6584]" />
              <span className="eq-bar-3 bg-[#6C63FF]" />
            </div>
          )}
          <button
            onClick={toggleLyrics}
            className="hidden md:flex w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white items-center justify-center border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
            title="Minimize Lyrics (Esc)"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* ── LYRICS FEED (Center Stage, highly premium scrolling display) ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-24 py-16 md:py-28 no-scrollbar scroll-smooth relative z-10 flex flex-col items-center"
      >
        <div className="w-full max-w-3xl">
          {loading ? (
            /* Immersive Shimmer Loading State */
            <div className="space-y-12 py-10 flex flex-col items-center w-full">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-gradient-to-r from-white/15 via-white/5 to-white/0 rounded-full animate-pulse"
                  style={{
                    width: `${90 - i * 12}%`,
                    opacity: 1 - i * 0.18,
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            /* Error display */
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-20">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl animate-[bounce_2s_infinite]">
                <AlertCircle size={40} className="text-[#FF6584]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-white text-2xl tracking-tight">Lyrics synchronization offline</h3>
                <p className="text-sm text-white/60 max-w-sm mx-auto leading-relaxed">
                  {"We searched the Tunely database but couldn't synchronize this song."}
                </p>
              </div>
              {currentSong && (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    currentSong.name + " " + currentSong.artist + " lyrics"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#8c82ff] text-xs font-black text-white shadow-xl shadow-[#6C63FF33] transition-transform hover:scale-105 active:scale-95 border border-white/10"
                >
                  Find Lyrics on Google
                </a>
              )}
            </div>
          ) : syncedLines.length > 0 && mode === "live" ? (
            /* ── Synced Immersive Apple Music Layout ── */
            <div className="space-y-8 py-20 md:py-40 select-none">
              {syncedLines.map((line, index) => {
                const isActive = index === activeLineIndex
                
                return (
                  <div
                    key={index}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => {
                      const player = document.querySelector("audio") as HTMLAudioElement
                      if (player) {
                        player.currentTime = line.time
                      }
                    }}
                    className={`immersive-lyric-line relative cursor-pointer py-2.5 transition-all duration-700 flex items-start gap-6 group rounded-2xl px-4 hover:bg-white/5 ${
                      isActive
                        ? "active-line text-white text-3xl sm:text-[34px] font-black leading-snug drop-shadow-[0_4px_20px_rgba(255,255,255,0.25)] scale-[1.03] opacity-100 blur-0 z-10"
                        : "text-white font-extrabold leading-relaxed text-2xl sm:text-2xl opacity-20 blur-[1px] hover:opacity-75 hover:blur-0"
                    }`}
                    style={{
                      transitionDelay: isActive ? "0ms" : "50ms",
                    }}
                  >
                    {/* Hover timestamp control bubble */}
                    <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-xl shadow-2xl scale-95 group-hover:scale-100">
                      <Play size={10} className="text-[#6C63FF] fill-[#6C63FF]" />
                      <span className="text-[10px] font-black text-white tabular-nums">
                        {formatLrcTime(line.time)}
                      </span>
                    </div>

                    <span className="flex-1">{line.text || "•••"}</span>
                  </div>
                )
              })}
            </div>
          ) : plainLyrics ? (
            /* ── Plain Classic Immersive Script ── */
            <div className="py-12 text-center max-w-2xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-black text-white/50 border border-white/5 uppercase tracking-widest block w-fit mx-auto mb-10">
                Aesthetic Classic Lyrics
              </span>
              <div
                className="text-xl sm:text-2xl leading-[2.2] text-white/80 whitespace-pre-wrap font-bold pb-24 select-text selection:bg-[#6C63FF44] drop-shadow-md"
                style={{ fontFamily: "inherit" }}
              >
                {plainLyrics}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-32">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Music size={28} className="text-[#6C63FF]" />
              </div>
              <p className="text-base font-extrabold text-white/60">Choose a track to stream synced lyrics</p>
            </div>
          )}
          
          {/* Similar Songs Section */}
          {recSongs && recSongs.length > 0 && (
            <div className="mt-20 pt-10 border-t border-white/5 select-none font-sans">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles size={16} className="text-[#FF6584] animate-pulse" />
                <h3 className="text-lg font-black text-white tracking-widest uppercase">
                  Similar Songs
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-none snap-x w-full">
                {recSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => handlePlayRecommendedSong(song)}
                    className="flex-shrink-0 w-32 sm:w-40 bg-white/5 border border-white/5 hover:border-[#6C63FF]/30 hover:bg-white/10 p-3 rounded-2xl cursor-pointer transition-all duration-300 snap-start group"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white/5 shadow-md group-hover:scale-[1.02] transition duration-300">
                      {song.image ? (
                        <img src={song.image} alt={song.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <Music size={24} className="text-gray-600" />
                        </div>
                      )}
                      {/* Play Hover Button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black scale-90 group-hover:scale-100 transition duration-200">
                          <Play size={14} className="fill-black ml-0.5 text-black" />
                        </div>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate mt-3 group-hover:text-[#6C63FF] transition-colors leading-snug">
                      {song.name}
                    </h4>
                    <p className="text-[10px] text-white/50 truncate mt-1">
                      {song.artist}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating active synchronized tracker footer inside panel */}
      {isPlaying && currentSong && (
        <div className="px-8 py-4 bg-gradient-to-t from-black/40 to-transparent backdrop-blur-sm border-t border-white/5 flex items-center justify-between text-[11px] text-white/40 font-bold tracking-widest flex-shrink-0 select-none relative z-10">
          <span className="flex items-center gap-2 text-[#6C63FF]">
            <Sparkles size={12} className="animate-spin" /> IMMERSIVE HARMONIC SYNC
          </span>
          <span className="tabular-nums font-black text-white/60 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {formatLrcTime(currentTime)} / {formatLrcTime(currentSong.duration)}
          </span>
        </div>
      )}
    </>
  )
}

export default function LyricsPanel() {
  const isLyricsOpen = usePlayerStore((state) => state.isLyricsOpen)
  const toggleLyrics = usePlayerStore((state) => state.toggleLyrics)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)

  return (
    <>
      {/* ── DESKTOP: Panel above player bar (original behavior) ── */}
      <div
        className={`hidden md:flex fixed inset-x-0 top-0 z-40 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex-col shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden ${
          isLyricsOpen ? "opacity-100 scale-100" : "opacity-0 scale-[1.05] pointer-events-none"
        }`}
        style={{
          bottom: "var(--player-height)",
          background: "rgba(6, 6, 10, 0.75)",
          backdropFilter: "blur(60px)",
        }}
      >
        {currentSong && (
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-1/3 -left-1/3 w-[120%] h-[120%] bg-cover bg-center opacity-35 blur-[140px] scale-110 animate-[spin_40s_linear_infinite]"
              style={{ backgroundImage: `url(${currentSong.image})` }}
            />
            <div
              className="absolute -bottom-1/3 -right-1/3 w-[120%] h-[120%] bg-cover bg-center opacity-25 blur-[160px] scale-110 animate-[spin_50s_linear_infinite_reverse]"
              style={{ backgroundImage: `url(${currentSong.image})` }}
            />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#6C63FF]/20 blur-[130px] animate-[pulse_10s_infinite_alternate]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#FF6584]/15 blur-[140px] animate-[pulse_12s_infinite_alternate_reverse]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#06060A]/60 via-[#06060A]/85 to-[#06060A]" />
          </div>
        )}

        {isLyricsOpen && currentSong && (
          <LyricsContent
            currentSong={currentSong}
            isPlaying={isPlaying}
            toggleLyrics={toggleLyrics}
          />
        )}
      </div>

      {/* ── MOBILE: Full-screen slide-up overlay ── */}
      <div
        className={`md:hidden fixed inset-0 z-[90] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          isLyricsOpen ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"
        }`}
        style={{
          background: "rgba(6, 6, 10, 0.92)",
          backdropFilter: "blur(60px)",
          paddingTop: "env(safe-area-inset-top, 24px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Immersive backdrop */}
        {currentSong && (
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-1/3 -left-1/3 w-[120%] h-[120%] bg-cover bg-center opacity-30 blur-[140px] scale-110 animate-[spin_40s_linear_infinite]"
              style={{ backgroundImage: `url(${currentSong.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#06060A]/70 via-[#06060A]/90 to-[#06060A]" />
          </div>
        )}

        {isLyricsOpen && currentSong && (
          <LyricsContent
            currentSong={currentSong}
            isPlaying={isPlaying}
            toggleLyrics={toggleLyrics}
          />
        )}
      </div>

      {/* CSS adjustments in global scope */}
      <style jsx global>{`
        .immersive-lyric-line {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), 
                      opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), 
                      filter 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.3s ease;
        }
        .active-line span {
          background: linear-gradient(135deg, #ffffff 30%, #e0d9ff 70%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </>
  )
}

