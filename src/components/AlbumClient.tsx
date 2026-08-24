"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Image from "next/image"
import { Disc, Play, Shuffle, ArrowLeft, Calendar, Music } from "lucide-react"
import SongPill from "@/components/SongPill"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

export default function AlbumClient({ link }: { link: string }) {
  const router = useRouter()
  const setQueue = usePlayerStore((state) => state.setQueue)

  // Fetch album details
  const { data: album, isLoading, isError } = useQuery<any>({
    queryKey: ["album", link],
    queryFn: async () => {
      if (!link) throw new Error("No album link provided")
      const res = await fetch(`/api/album?link=${encodeURIComponent(link)}`)
      if (!res.ok) throw new Error("Failed to fetch album info")
      return res.json()
    },
    enabled: !!link,
    staleTime: 300000,
    gcTime: 600000,
  })

  // Fetch similar albums
  const { data: recAlbums } = useQuery<any[]>({
    queryKey: ["albumRecommend", album?.id],
    queryFn: async () => {
      if (!album?.id) return []
      const res = await fetch(`/api/album/recommend?id=${album.id}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    },
    enabled: !!album?.id,
    staleTime: 300000,
    gcTime: 600000,
  })

  // Fetch albums from same year
  const { data: sameYearAlbums } = useQuery<any[]>({
    queryKey: ["albumSameYear", album?.year],
    queryFn: async () => {
      if (!album?.year) return []
      const res = await fetch(`/api/album/same-year?year=${album.year || new Date().getFullYear()}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    },
    enabled: !!album?.year || !!album?.id,
    staleTime: 300000,
    gcTime: 600000,
  })

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start py-8">
          <div className="w-64 h-64 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
          <div className="flex-1 space-y-4 w-full">
            <div className="h-8 bg-gray-800 rounded-lg w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-800 rounded-lg w-1/4 animate-pulse" />
            <div className="h-4 bg-gray-800 rounded-lg w-1/3 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !album) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Disc size={48} className="text-red-400" />
        <p className="text-gray-400 font-semibold">Could not load album details.</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-[#6C63FF] rounded-lg text-xs font-bold text-white hover:opacity-90">
          Go Back
        </button>
      </div>
    )
  }

  const songsList: Song[] = (album.songs || []).map((song: any) => ({
    id: song.id,
    name: song.name,
    artist: song.subtitle || album.artist || "Various Artists",
    image: song.image || album.image,
    streamUrl: song.streamUrl || song.download_url?.[4]?.link || "",
    duration: song.duration || 180,
  }))

  const handlePlayAll = (shuffle = false) => {
    if (songsList.length === 0) return
    
    if (shuffle) {
      const shuffled = [...songsList].sort(() => Math.random() - 0.5)
      setQueue(shuffled, 0)
    } else {
      setQueue(songsList, 0)
    }
  }

  const handlePlaySong = (song: Song) => {
    const idx = songsList.findIndex((s) => s.id === song.id)
    setQueue(songsList, idx === -1 ? 0 : idx)
  }

  return (
    <div className="relative min-h-full select-none">
      {/* Blurred Backdrop Artwork Layer */}
      {album.image && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 blur-[80px] -z-10 pointer-events-none scale-105"
          style={{ backgroundImage: `url(${album.image})` }}
        />
      )}

      <div className="max-w-6xl mx-auto px-6 py-6 pb-36 md:pb-12 space-y-6">
        {/* Back navigation */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold mb-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Top Banner Grid layout */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Album Cover */}
          <div className="w-64 h-64 rounded-3xl overflow-hidden bg-gray-900 border border-[#6C63FF33] shadow-2xl flex-shrink-0 relative group">
            {album.image ? (
              <Image 
                src={album.image} 
                alt={album.name} 
                width={256}
                height={256}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc size={128} className="text-[#6C63FF]" />
              </div>
            )}
            
            {/* Play Overlay */}
            <div 
              onClick={() => handlePlayAll(false)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300 cursor-pointer"
            >
              <div className="w-14 h-14 bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition duration-300 shadow-lg">
                <Play size={24} className="fill-white ml-1 text-white" />
              </div>
            </div>
          </div>

          {/* Info Block */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#6C63FF] font-bold block">
              Album
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight block">
              {album.name}
            </h2>
            
            {/* Metadata pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-400">
              <span className="font-semibold text-white">
                By {album.artist || "Various Artists"}
              </span>
              <span className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {album.year || "N/A"}
              </span>
              <span className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
              <span className="flex items-center gap-1">
                <Music size={13} />
                {songsList.length} Tracks
              </span>
            </div>

            {/* Description */}
            {album.description && (
              <p className="text-sm text-gray-400 leading-relaxed max-w-2xl text-left" dangerouslySetInnerHTML={{ __html: album.description }} />
            )}

            {/* Play Actions bar */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={() => handlePlayAll(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider rounded-full transition duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play size={14} className="fill-black" />
                Play All
              </button>
              <button
                onClick={() => handlePlayAll(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider rounded-full border border-white/10 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Shuffle size={14} />
                Shuffle
              </button>
            </div>
          </div>
        </div>

        {/* Track List Panel */}
        <div className="pt-8 space-y-4">
          <h3 className="text-xl font-bold text-white border-b border-gray-900/60 pb-3 text-left">
            Track List
          </h3>

          {songsList.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No playable tracks found in this album.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {songsList.map((song, index) => (
                <div key={song.id} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-gray-500 text-right hidden sm:block">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <SongPill 
                      song={song} 
                      onSongSelected={handlePlaySong}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Similar Albums Row */}
        {recAlbums && recAlbums.length > 0 && (
          <div className="pt-10">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-900/60 pb-3 font-black text-left">
              Similar Albums
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x font-sans">
              {recAlbums.map((alb: any) => (
                <Link
                  key={alb.id || alb.link}
                  href={`/album?link=${encodeURIComponent(alb.link)}`}
                  className="flex-shrink-0 w-36 sm:w-44 bg-[#12121E]/60 border border-[#6C63FF11] hover:border-[#6C63FF33] hover:bg-[#12121E]/95 p-3 rounded-2xl cursor-pointer transition-all duration-300 snap-start group block text-left font-normal"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-900 shadow-md group-hover:scale-[1.02] transition duration-300">
                    {alb.image ? (
                      <Image src={alb.image} alt={alb.name} width={176} height={176} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-850">
                        <Disc size={36} className="text-gray-700" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate mt-3 group-hover:text-[#6C63FF] transition-colors">
                    {alb.name}
                  </h4>
                  <p className="text-xs text-[#B3B3B3] truncate mt-1">
                    {alb.artist || alb.subtitle || "Various Artists"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Same Year Albums Row */}
        {sameYearAlbums && sameYearAlbums.length > 0 && (
          <div className="pt-10">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-900/60 pb-3 font-black text-left">
              More from {album.year || "this year"}
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x font-sans">
              {sameYearAlbums.map((alb: any) => (
                <Link
                  key={alb.id || alb.link}
                  href={`/album?link=${encodeURIComponent(alb.link)}`}
                  className="flex-shrink-0 w-36 sm:w-44 bg-[#12121E]/60 border border-[#6C63FF11] hover:border-[#6C63FF33] hover:bg-[#12121E]/95 p-3 rounded-2xl cursor-pointer transition-all duration-300 snap-start group block text-left font-normal"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-900 shadow-md group-hover:scale-[1.02] transition duration-300">
                    {alb.image ? (
                      <Image src={alb.image} alt={alb.name} width={176} height={176} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-850">
                        <Disc size={36} className="text-gray-700" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate mt-3 group-hover:text-[#6C63FF] transition-colors">
                    {alb.name}
                  </h4>
                  <p className="text-xs text-[#B3B3B3] truncate mt-1">
                    {alb.artist || alb.subtitle || "Various Artists"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
