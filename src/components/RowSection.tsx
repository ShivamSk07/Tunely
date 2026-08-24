"use client"

import React from "react"
import Image from "next/image"
import { Play, Disc } from "lucide-react"
import { Song, usePlayerStore } from "@/store/usePlayerStore"

interface RowSectionProps {
  title: string
  songs: Song[]
  isLoading: boolean
  onSongSelected?: (song: Song) => void
  showAll?: boolean
  /** Mobile-only card width variant — desktop layout unchanged */
  mobileCardSize?: "sm" | "md" | "lg"
}

const MOBILE_CARD_SIZES = { sm: 128, md: 148, lg: 168 } as const

export default function RowSection({ title, songs, isLoading, onSongSelected, mobileCardSize = "md" }: RowSectionProps) {
  const cardSize = MOBILE_CARD_SIZES[mobileCardSize]
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const [isExpanded, setIsExpanded] = React.useState(false)

  if (!isLoading && songs.length === 0) return null

  return (
    <div className="space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6">
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-tight hover:text-white/80 cursor-pointer">{title}</h3>
        {/* Show all button only on desktop */}
        {songs.length > 6 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex text-[11px] font-semibold text-white/70 hover:text-white uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] rounded-full border border-white/10"
          >
            {isExpanded ? "Show less" : "Show all"}
          </button>
        )}
      </div>

      {/* ── MOBILE: Horizontal swipeable scroll ── */}
      <div className="md:hidden">
        <div
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 snap-start space-y-2" style={{ width: cardSize }}>
                  <div className="rounded-xl bg-white/[0.03] animate-pulse" style={{ width: cardSize, height: cardSize }} />
                  <div className="h-3 bg-white/[0.03] rounded w-3/4 animate-pulse" />
                  <div className="h-2.5 bg-white/[0.03] rounded w-1/2 animate-pulse" />
                </div>
              ))
            : songs.slice(0, 12).map((song) => {
                const isCurrent = currentSong?.id === song.id
                return (
                  <div
                    key={song.id}
                    className="flex-shrink-0 snap-start cursor-pointer scroll-ml-4"
                    style={{ width: cardSize }}
                    onClick={() => onSongSelected?.(song)}
                  >
                    <div
                      className="relative rounded-xl overflow-hidden bg-[#161722] border border-white/[0.06] shadow-sm"
                      style={{ width: cardSize, height: cardSize }}
                    >
                      {song.image ? (
                        <Image
                          src={song.image}
                          alt={song.name}
                          width={cardSize}
                          height={cardSize}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Disc size={32} className="text-white/30" />
                        </div>
                      )}
                      {/* Active overlay */}
                      {isCurrent && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="eq-container">
                            <span className="eq-bar-1" />
                            <span className="eq-bar-2" />
                            <span className="eq-bar-3" />
                          </div>
                        </div>
                      )}
                      {/* Play button overlay on hover */}
                      <div className={`absolute inset-0 flex items-end justify-end p-2 transition-opacity ${
                        isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                          <Play size={13} className="fill-black text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pr-1">
                      <p className={`text-xs font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-white/90"}`}>
                        {song.name}
                      </p>
                      <p className="text-[11px] text-white/50 truncate mt-0.5">{song.artist}</p>
                    </div>
                  </div>
                )
              })}
        </div>
      </div>

      {/* ── DESKTOP: Grid layout ── */}
      <div className="hidden md:block px-6">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square rounded-2xl bg-white/[0.03] animate-pulse" />
                <div className="h-4 bg-white/[0.03] rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-white/[0.03] rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {(isExpanded ? songs : songs.slice(0, 6)).map((song) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  key={song.id}
                  className="playlist-card bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 p-3.5 space-y-3 cursor-pointer transition-all duration-200 rounded-2xl hover:-translate-y-1 hover:shadow-lg hover:shadow-black/50"
                  onClick={() => onSongSelected?.(song)}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[#161722] border border-white/[0.06]">
                    {song.image ? (
                      <Image
                        src={song.image}
                        alt={song.name}
                        fill
                        sizes="(max-width: 768px) 25vw, 16vw"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc size={36} className="text-white/30" />
                      </div>
                    )}
                    <div className={`play-overlay ${isCurrent && isPlaying ? "opacity-100 translate-y-0" : ""}`}>
                      <Play size={18} className="fill-black text-black ml-0.5" />
                    </div>
                    {isCurrent && (
                      <div className="absolute bottom-2 left-2 eq-container">
                        <span className="eq-bar-1" />
                        <span className="eq-bar-2" />
                        <span className="eq-bar-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs md:text-sm font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-white/90"}`}>
                      {song.name}
                    </p>
                    <p className="text-[10px] md:text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
