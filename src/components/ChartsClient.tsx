"use client"

import React, { useState } from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { Play, Pause, BarChart2, TrendingUp } from "lucide-react"
import { usePlayerStore, Song } from "@/store/usePlayerStore"

const LANGUAGES = [
  { label: "Hindi", value: "hindi" },
  { label: "Punjabi", value: "punjabi" },
  { label: "Bhojpuri", value: "bhojpuri" },
  { label: "English", value: "english" },
]

interface Props {
  initialSongs: Song[]
  initialLang: string
}

export default function ChartsClient({ initialSongs, initialLang }: Props) {
  const [activeLang, setActiveLang] = useState(initialLang)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const play = usePlayerStore((s) => s.play)
  const pause = usePlayerStore((s) => s.pause)

  const { data: songs, isLoading } = useQuery<Song[]>({
    queryKey: ["charts", activeLang],
    queryFn: async () => {
      const res = await fetch(`/api/charts?lang=${activeLang}`)
      if (!res.ok) throw new Error("Charts fetch failed")
      const json = await res.json()
      return json.data || []
    },
    initialData: (activeLang === initialLang && initialSongs && initialSongs.length > 0) ? initialSongs : undefined,
    staleTime: 1000 * 60 * 5,
  })

  const songsList = songs || []

  const handlePlay = (song: Song, index: number) => {
    if (currentSong?.id === song.id) {
      isPlaying ? pause() : play()
    } else {
      setQueue(songsList, index)
    }
  }

  const formatCount = (count: string | number | undefined) => {
    if (!count) return ""
    const n = typeof count === "string" ? parseInt(count.replace(/,/g, ""), 10) : count
    if (isNaN(n)) return String(count)
    if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr plays`
    if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L plays`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K plays`
    return `${n} plays`
  }

  return (
    <div className="min-h-full pb-36 md:pb-12">
      {/* Header */}
      <div className="px-4 md:px-6 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Top Charts</h1>
            <p className="text-xs text-white/50">Most played tracks right now</p>
          </div>
        </div>
      </div>

      {/* Language Tabs */}
      <div className="px-4 md:px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setActiveLang(lang.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all uppercase tracking-wider flex-shrink-0 ${
                activeLang === lang.value
                  ? "bg-white text-black shadow-sm"
                  : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart List */}
      <div className="px-4 md:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.025] animate-pulse h-[68px]" />
            ))}
          </div>
        ) : songsList.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp size={48} className="text-[#727272] mx-auto mb-3" />
            <p className="text-white font-bold">No charts available</p>
            <p className="text-[#B3B3B3] text-sm mt-1">Try a different language</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {songsList.map((song, i) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  key={song.id || i}
                  onClick={() => handlePlay(song, i)}
                  className={`flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl cursor-pointer transition-all duration-150 group border ${
                    isCurrent
                      ? "bg-white/[0.06] border-white/20"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04] hover:border-white/10"
                  }`}
                >
                  {/* Rank */}
                  <span
                    className={`w-7 text-center text-sm font-bold flex-shrink-0 tabular-nums ${
                      i < 3
                        ? "text-white"
                        : isCurrent ? "text-white" : "text-white/40"
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <span className="eq-container inline-flex justify-center" style={{ height: "16px" }}>
                        <span className="eq-bar-1" /><span className="eq-bar-2" /><span className="eq-bar-3" />
                      </span>
                    ) : i + 1}
                  </span>

                  {/* Cover */}
                  <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#161722] border border-white/[0.06]">
                    {song.image ? (
                      <Image src={song.image} alt={song.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/[0.04]" />
                    )}
                    {/* Play overlay */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      {isCurrent && isPlaying
                        ? <Pause size={15} className="fill-white text-white" />
                        : <Play size={15} className="fill-white text-white ml-0.5" />
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-white/90 group-hover:text-white"}`}>
                      {song.name}
                    </p>
                    <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
                  </div>

                  {/* Play count */}
                  {song.playCount && (
                    <span className="text-xs text-white/40 tabular-nums hidden sm:block flex-shrink-0">
                      {formatCount(song.playCount)}
                    </span>
                  )}

                  {/* Play button (mobile) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlay(song, i) }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all sm:hidden ${
                      isCurrent ? "bg-white text-black" : "bg-white/10 text-white opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isCurrent && isPlaying
                      ? <Pause size={13} className="fill-current" />
                      : <Play size={13} className="fill-current ml-0.5" />
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
