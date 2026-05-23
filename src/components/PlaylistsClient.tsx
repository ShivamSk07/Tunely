"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { ListMusic, Play } from "lucide-react"

interface PlaylistItem {
  id: string
  name: string
  image: string
  link: string
  songCount?: number
}

interface Props {
  initialPlaylists: PlaylistItem[]
}

export default function PlaylistsClient({ initialPlaylists }: Props) {
  const playlists = initialPlaylists

  return (
    <div className="min-h-full pb-36 md:pb-12">
      {/* Header */}
      <div className="px-4 md:px-6 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6584] to-[#6C63FF] flex items-center justify-center flex-shrink-0 shadow-lg">
            <ListMusic size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Featured Playlists</h1>
            <p className="text-xs text-[#B3B3B3]">Curated by JioSaavn editors</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6">
        {playlists.length === 0 ? (
          <div className="text-center py-20">
            <ListMusic size={48} className="text-[#727272] mx-auto mb-3" />
            <p className="text-white font-bold">No playlists available</p>
            <p className="text-[#B3B3B3] text-sm mt-1">Check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
            {playlists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/jiosaavn-playlist?id=${playlist.id}`}
                className="group playlist-card bg-[#181818] hover:bg-[#282828] p-3 rounded-xl transition-all duration-200 block font-normal"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#282828]">
                  {playlist.image ? (
                    <Image
                      src={playlist.image}
                      alt={playlist.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ListMusic size={40} className="text-[#727272]" />
                    </div>
                  )}
                  <div className="play-overlay">
                    <Play size={20} className="fill-white text-white ml-1" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-white truncate group-hover:text-[#6C63FF] transition-colors">
                  {playlist.name}
                </p>
                {playlist.songCount != null && playlist.songCount > 0 && (
                  <p className="text-xs text-[#B3B3B3] mt-0.5">{playlist.songCount} songs</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
