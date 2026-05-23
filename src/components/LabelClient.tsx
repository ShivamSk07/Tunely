"use client"

import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Disc, User, ChevronDown, Tag } from "lucide-react"

interface Album {
  id: string
  name: string
  artist: string
  year: string
  image: string
  link: string
}

interface Artist {
  id: string
  name: string
  image: string
  link: string
}

interface LabelData {
  name: string
  image: string
  albums: Album[]
  artists: Artist[]
  total: number
}

interface Props {
  token: string
  type: string
  initialPage: number
}

export default function LabelClient({ token, type, initialPage }: Props) {
  const [page, setPage] = useState(initialPage)

  const { data, isLoading, isError } = useQuery<LabelData>({
    queryKey: ["label", token, type, page],
    queryFn: async () => {
      if (!token) throw new Error("No token")
      const res = await fetch(`/api/label?token=${encodeURIComponent(token)}&type=${type}&p=${page}`)
      if (!res.ok) throw new Error("Failed to fetch label")
      const json = await res.json()
      return json.data
    },
    enabled: !!token,
    staleTime: 600000,
  })

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center px-6">
        <Tag size={48} className="text-[#727272]" />
        <p className="text-white font-bold text-lg">No label specified</p>
        <p className="text-[#B3B3B3] text-sm">Please provide a label token in the URL</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-6 pt-8 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[#1a1a24] rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-[#1a1a24] rounded-xl" />
              <div className="h-3 bg-[#1a1a24] rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Tag size={48} className="text-[#727272]" />
        <p className="text-white font-bold">Label not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-full pb-36 md:pb-12">
      {/* Label Header */}
      <div className="px-4 md:px-6 pt-6 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1a1a24] flex-shrink-0 border border-white/5">
            {data.image ? (
              <Image src={data.image} alt={data.name} width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag size={28} className="text-[#6C63FF]" />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-[#6C63FF] font-bold uppercase tracking-widest mb-1">Record Label</p>
            <h1 className="text-2xl md:text-3xl font-black text-white">{data.name || token}</h1>
            <p className="text-sm text-[#B3B3B3] mt-0.5">{data.total} albums</p>
          </div>
        </div>

        {/* Artists Row */}
        {data.artists && data.artists.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-black text-white mb-4">Artists</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {data.artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist?link=${encodeURIComponent(artist.link)}`}
                  className="flex-shrink-0 w-28 text-center group"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto bg-[#1a1a24] border border-white/5 mb-2 group-hover:border-[#6C63FF33] transition-colors">
                    {artist.image ? (
                      <Image src={artist.image} alt={artist.name} width={80} height={80} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={28} className="text-[#727272]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white truncate group-hover:text-[#6C63FF] transition-colors">
                    {artist.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Albums Grid */}
        <h2 className="text-lg font-black text-white mb-4">Albums</h2>
        {data.albums.length === 0 ? (
          <div className="text-center py-12">
            <Disc size={40} className="text-[#727272] mx-auto mb-3" />
            <p className="text-[#B3B3B3]">No albums found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {data.albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/album?link=${encodeURIComponent(album.link)}`}
                  className="group playlist-card bg-[#181818] hover:bg-[#282828] p-3 rounded-xl transition-all duration-200 block"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#282828]">
                    {album.image ? (
                      <Image src={album.image} alt={album.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc size={40} className="text-[#727272]" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate group-hover:text-[#6C63FF] transition-colors">
                    {album.name}
                  </p>
                  <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{album.year || album.artist}</p>
                </Link>
              ))}
            </div>

            {/* Load More */}
            {data.albums.length >= 20 && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a24] hover:bg-[#282828] text-white text-sm font-semibold rounded-full border border-white/10 transition-all hover:border-white/20"
                >
                  <ChevronDown size={16} /> Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
