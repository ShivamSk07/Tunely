"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { Disc, Play } from "lucide-react"

interface AlbumItem {
  id: string
  name: string
  artist: string
  image: string
  link: string
}

interface RowAlbumsProps {
  title: string
  albums: AlbumItem[]
  isLoading: boolean
  linkPrefix?: string // if provided, overrides default /album?link= behavior
  /** Mobile-only card width variant — desktop layout unchanged */
  mobileCardSize?: "sm" | "md" | "lg"
}

const MOBILE_CARD_SIZES = { sm: 128, md: 148, lg: 168 } as const

function getAlbumHref(link: string): string {
  // If it's already an internal path (starts with /), use it directly
  if (link.startsWith("/")) return link
  return `/album?link=${encodeURIComponent(link)}`
}

export default function RowAlbums({ title, albums, isLoading, mobileCardSize = "md" }: RowAlbumsProps) {
  const cardSize = MOBILE_CARD_SIZES[mobileCardSize]
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = React.useState(false)

  const handlePrefetchAlbum = (link: string) => {
    queryClient.prefetchQuery({
      queryKey: ["album", link],
      queryFn: async () => {
        const res = await fetch(`/api/album?link=${encodeURIComponent(link)}`)
        if (!res.ok) throw new Error("Failed to fetch album")
        return res.json()
      },
      staleTime: 300000,
    })
  }

  if (!isLoading && albums.length === 0) return null

  return (
    <div className="space-y-3 select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6">
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-tight hover:text-white/80 cursor-pointer">{title}</h3>
        {/* Show all button only on desktop */}
        {albums.length > 6 && (
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
            : albums.slice(0, 12).map((album) => (
                <Link
                  key={album.id}
                  href={getAlbumHref(album.link)}
                  onMouseEnter={() => handlePrefetchAlbum(album.link)}
                  className="flex-shrink-0 snap-start cursor-pointer block text-left scroll-ml-4"
                  style={{ width: cardSize }}
                >
                  <div
                    className="relative rounded-xl overflow-hidden bg-[#161722] border border-white/[0.06] shadow-sm"
                    style={{ width: cardSize, height: cardSize }}
                  >
                    {album.image ? (
                      <Image
                        src={album.image}
                        alt={album.name}
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
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shadow-md">
                      <Play size={13} className="fill-black text-black ml-0.5" />
                    </div>
                  </div>
                  <div className="mt-2 pr-1">
                    <p className="text-xs font-semibold truncate text-white">{album.name}</p>
                    <p className="text-[11px] text-white/50 truncate mt-0.5">{album.artist || "Album"}</p>
                  </div>
                </Link>
              ))}
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
            {(isExpanded ? albums : albums.slice(0, 6)).map((album) => (
              <Link
                key={album.id}
                href={getAlbumHref(album.link)}
                onMouseEnter={() => handlePrefetchAlbum(album.link)}
                className="playlist-card bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 p-3.5 space-y-3 cursor-pointer transition-all duration-200 rounded-2xl hover:-translate-y-1 hover:shadow-lg hover:shadow-black/50 block text-left font-normal"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#161722] border border-white/[0.06]">
                  {album.image ? (
                    <Image
                      src={album.image}
                      alt={album.name}
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
                  <div className="play-overlay">
                    <Play size={18} className="fill-black text-black ml-0.5" />
                  </div>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold text-white truncate">{album.name}</p>
                  <p className="text-[10px] md:text-xs text-white/50 truncate mt-0.5">{album.artist || "Album"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
