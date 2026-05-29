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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#FF6584] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#6C63FF33]">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Top Charts</h1>
            <p className="text-xs text-[#B3B3B3]">Most played tracks right now</p>
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
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeLang === lang.value
                  ? "bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF33]"
                  : "bg-[#1a1a24] text-[#B3B3B3] hover:text-white hover:bg-[#282828]"
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
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[#1a1a24] animate-pulse h-[72px]" />
            ))}
          </div>
        ) : songsList.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp size={48} className="text-[#727272] mx-auto mb-3" />
            <p className="text-white font-bold">No charts available</p>
            <p className="text-[#B3B3B3] text-sm mt-1">Try a different language</p>
          </div>
        ) : (
          <div className="space-y-1">
            {songsList.map((song, i) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  key={song.id}
                  onClick={() => handlePlay(song, i)}
                  className={`flex items-center gap-3 md:gap-4 px-3 py-2.5 rounded-xl cursor-pointer group transition-all duration-150 ${
                    isCurrent ? "bg-[#6C63FF15] border border-[#6C63FF30]" : "hover:bg-[#1a1a24]"
                  }`}
                >
                  {/* Rank */}
                  <span
                    className={`w-7 text-center text-sm font-black flex-shrink-0 tabular-nums ${
                      i < 3
                        ? i === 0 ? "text-[#FFD700]" : i === 1 ? "text-[#C0C0C0]" : "text-[#CD7F32]"
                        : isCurrent ? "text-[#6C63FF]" : "text-[#727272]"
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <span className="eq-container inline-flex justify-center" style={{ height: "16px" }}>
                        <span className="eq-bar-1" /><span className="eq-bar-2" /><span className="eq-bar-3" />
                      </span>
                    ) : i + 1}
                  </span>

                  {/* Cover */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                    {song.image ? (
                      <Image src={song.image} alt={song.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#282828]" />
                    )}
                    {/* Play overlay */}
                    <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      {isCurrent && isPlaying
                        ? <Pause size={16} className="fill-white text-white" />
                        : <Play size={16} className="fill-white text-white ml-0.5" />
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isCurrent ? "text-[#6C63FF]" : "text-white"}`}>
                      {song.name}
                    </p>
                    <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{song.artist}</p>
                  </div>

                  {/* Play count */}
                  {song.playCount && (
                    <span className="text-xs text-[#727272] tabular-nums hidden sm:block flex-shrink-0">
                      {formatCount(song.playCount)}
                    </span>
                  )}

                  {/* Play button (mobile) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlay(song, i) }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all sm:hidden ${
                      isCurrent ? "bg-[#6C63FF]" : "bg-[#6C63FF] opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isCurrent && isPlaying
                      ? <Pause size={14} className="fill-white text-white" />
                      : <Play size={14} className="fill-white text-white ml-0.5" />
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
