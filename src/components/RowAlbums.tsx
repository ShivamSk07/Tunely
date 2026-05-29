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

      {/* Header — same style as RowSection */}
      <div className="flex items-center justify-between px-4 md:px-6">
        {title && <h3 className="text-lg md:text-2xl font-black text-white tracking-tight">{title}</h3>}
        {albums.length > 6 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex text-xs font-bold text-[#6C63FF] hover:text-white uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full border border-white/10"
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
                  <div className="rounded-xl shimmer" style={{ width: cardSize, height: cardSize }} />
                  <div className="h-3 shimmer rounded w-3/4" />
                  <div className="h-2.5 shimmer rounded w-1/2" />
                </div>
              ))
            : albums.slice(0, 12).map((album) => (
                <Link
                  key={album.id}
                  href={getAlbumHref(album.link)}
                  onMouseEnter={() => handlePrefetchAlbum(album.link)}
                  className="flex-shrink-0 snap-start cursor-pointer block text-left"
                  style={{ width: cardSize }}
                >
                  <div
                    className="relative rounded-xl overflow-hidden bg-[#282828] shadow-lg"
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
                        <Disc size={36} className="text-[#727272]" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#6C63FF] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shadow-lg">
                      <Play size={14} className="fill-white text-white ml-0.5" />
                    </div>
                  </div>
                  <div className="mt-2 pr-1">
                    <p className="text-xs font-semibold truncate text-white">{album.name}</p>
                    <p className="text-[11px] text-[#B3B3B3] truncate mt-0.5">{album.artist || "Album"}</p>
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
                <div className="aspect-square rounded-xl shimmer" />
                <div className="h-3.5 shimmer rounded w-3/4" />
                <div className="h-3 shimmer rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 transition-all duration-300">
            {(isExpanded ? albums : albums.slice(0, 6)).map((album) => (
              <Link
                key={album.id}
                href={getAlbumHref(album.link)}
                onMouseEnter={() => handlePrefetchAlbum(album.link)}
                className="playlist-card bg-[#181818] hover:bg-[#282828] p-4 space-y-3 cursor-pointer transition-all duration-200 rounded-xl hover:-translate-y-1 hover:shadow-lg block text-left font-normal"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-[#282828] shadow-xl">
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
                      <Disc size={40} className="text-[#727272]" />
                    </div>
                  )}
                  <div className="play-overlay">
                    <Play size={20} className="fill-white text-white ml-1" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate">{album.name}</p>
                  <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{album.artist || "Album"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
