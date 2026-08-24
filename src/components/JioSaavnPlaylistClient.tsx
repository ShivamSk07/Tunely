"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Play, Shuffle, ArrowLeft, ListMusic, Music } from "lucide-react"
import SongPill from "@/components/SongPill"
import { usePlayerStore, Song } from "@/store/usePlayerStore"

interface PlaylistData {
  id: string
  name: string
  image?: string
  description?: string
  songCount?: number
  songs: Song[]
  isJioSaavn?: boolean
}

interface SimilarPlaylist {
  id: string
  name: string
  image: string
  link: string
}

interface Props {
  id: string
  initialPlaylist: PlaylistData | null
}

export default function JioSaavnPlaylistClient({ id, initialPlaylist }: Props) {
  const router = useRouter()
  const setQueue = usePlayerStore((s) => s.setQueue)

  const { data: playlist, isLoading, isError, isFetched } = useQuery<PlaylistData>({
    queryKey: ["jiosaavn-playlist", id],
    queryFn: async () => {
      if (!id) throw new Error("No playlist ID")
      const res = await fetch(`/api/playlist?id=${id}`)
      if (!res.ok) throw new Error("Failed to fetch playlist")
      const json = await res.json()
      // API may return data nested under `data` key or directly
      return json.data || json
    },
    enabled: !!id,
    staleTime: 300000,
    retry: 2,
  })

  const { data: similarPlaylists = [] } = useQuery<SimilarPlaylist[]>({
    queryKey: ["playlist-recommend", id],
    queryFn: async () => {
      if (!id) return []
      const res = await fetch(`/api/playlist/recommend?id=${id}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    },
    enabled: !!id,
    staleTime: 600000,
  })

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-16 bg-[#1a1a24] rounded-lg" />
        <div className="flex flex-col md:flex-row gap-8 py-8">
          <div className="w-64 h-64 bg-[#1a1a24] rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-[#1a1a24] rounded w-1/2" />
            <div className="h-4 bg-[#1a1a24] rounded w-1/3" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#1a1a24] rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError || (isFetched && !playlist)) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <ListMusic size={48} className="text-[#727272]" />
        <p className="text-white font-bold">Playlist not found</p>
        <p className="text-[#B3B3B3] text-sm">Could not load playlist data. Try again later.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-white text-black font-bold rounded-full text-sm hover:scale-105 transition-transform"
        >
          Go Back
        </button>
      </div>
    )
  }

  if (!playlist) return null

  const songsList: Song[] = (playlist.songs || []).map((s: any) => ({
    id: s.id || s.songId || "",
    name: s.name || s.songName || s.title || "Unknown",
    artist: s.artist || s.subtitle || s.primaryArtists || "Unknown",
    image: (Array.isArray(s.image)
      ? (s.image[2]?.link || s.image[s.image.length - 1]?.link || "")
      : (s.image || "")
    ).replace("http://", "https://"),
    streamUrl: (Array.isArray(s.download_url)
      ? (s.download_url[4]?.link || s.download_url[s.download_url.length - 1]?.link || "")
      : (s.streamUrl || "")
    ).replace("http://", "https://"),
    duration: s.duration || 0,
    downloadUrls: s.downloadUrls || s.download_url,
  })).filter((s: Song) => s.id && s.streamUrl)

  const handlePlayAll = (shuffle = false) => {
    if (songsList.length === 0) return
    if (shuffle) {
      setQueue([...songsList].sort(() => Math.random() - 0.5), 0)
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
      {playlist.image && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 blur-[80px] -z-10 pointer-events-none scale-105"
          style={{ backgroundImage: `url(${playlist.image})` }}
        />
      )}

      <div className="max-w-6xl mx-auto px-6 py-6 pb-36 md:pb-12 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-3xl overflow-hidden bg-[#1a1a24] border border-[#6C63FF22] shadow-2xl flex-shrink-0 relative group">
            {playlist.image ? (
              <Image
                src={playlist.image}
                alt={playlist.name}
                fill
                className="object-cover group-hover:scale-105 transition duration-500"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ListMusic size={80} className="text-[#6C63FF]" />
              </div>
            )}
            {songsList.length > 0 && (
              <div
                onClick={() => handlePlayAll()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300 cursor-pointer"
              >
                <div className="w-14 h-14 bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] rounded-full flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition">
                  <Play size={24} className="fill-white text-white ml-1" />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#6C63FF] font-bold block">
              Featured Playlist
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-sm text-[#B3B3B3] leading-relaxed max-w-xl">{playlist.description}</p>
            )}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Music size={13} /> {songsList.length} Tracks
              </span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={() => handlePlayAll(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider rounded-full transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play size={14} className="fill-black" /> Play All
              </button>
              <button
                onClick={() => handlePlayAll(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider rounded-full border border-white/10 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Shuffle size={14} /> Shuffle
              </button>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="pt-4 space-y-4">
          <h3 className="text-xl font-bold text-white border-b border-gray-900/60 pb-3">Track List</h3>
          {songsList.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No playable tracks found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {songsList.map((song, index) => (
                <div key={song.id} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-gray-500 text-right hidden sm:block">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <SongPill song={song} onSongSelected={handlePlaySong} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Similar Playlists */}
        {similarPlaylists.length > 0 && (
          <div className="pt-10">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-900/60 pb-3">
              Similar Playlists
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
              {similarPlaylists.map((p) => (
                <Link
                  key={p.id}
                  href={`/jiosaavn-playlist?id=${p.id}`}
                  className="flex-shrink-0 w-36 sm:w-44 bg-[#12121E]/60 border border-[#6C63FF11] hover:border-[#6C63FF33] hover:bg-[#12121E]/95 p-3 rounded-2xl cursor-pointer transition-all duration-300 snap-start group block text-left font-normal"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-900 shadow-md group-hover:scale-[1.02] transition">
                    {p.image ? (
                      <Image src={p.image} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic size={36} className="text-gray-700" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate mt-3 group-hover:text-[#6C63FF] transition-colors">
                    {p.name}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
