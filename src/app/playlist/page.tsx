"use client"

import React, { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Play, Shuffle, ArrowLeft, Trash2, Music, ListMusic, Lock, Loader2 } from "lucide-react"
import SongPill from "@/components/SongPill"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

function PlaylistDetailsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const setQueue = usePlayerStore((state) => state.setQueue)
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)

  const id = searchParams.get("id") || ""

  interface PlaylistSong {
    songId: string
    songName: string
    artist: string
    image: string
    streamUrl: string
    duration?: number
  }

  interface PlaylistDetails {
    id: string
    name: string
    songs: PlaylistSong[]
  }

  // Fetch playlist details
  const { data: playlist, isLoading, isError } = useQuery<PlaylistDetails>({
    queryKey: ["playlist", id],
    queryFn: async (): Promise<PlaylistDetails> => {
      const res = await fetch(`/api/library/playlists?id=${id}`)
      if (!res.ok) throw new Error("Failed to fetch playlist")
      return res.json()
    },
    enabled: !!id && !!session,
  })

  // Delete Playlist Mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/library/playlists?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete playlist")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Playlist deleted.")
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
      router.push("/library")
    },
    onError: () => {
      toast.error("Could not delete playlist")
    },
  })

  // Adapt database PlaylistSong list to Song type for player queue
  const songsList: Song[] = (playlist?.songs || []).map((s) => ({
    id: s.songId,
    name: s.songName,
    artist: s.artist,
    image: s.image,
    streamUrl: s.streamUrl,
    duration: s.duration || 180,
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

  const handleDeletePlaylist = () => {
    if (confirm(`Are you sure you want to delete "${playlist?.name}"?`)) {
      deletePlaylistMutation.mutate()
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start py-8">
          <div className="w-64 h-64 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
          <div className="flex-1 space-y-4 w-full">
            <div className="h-8 bg-gray-800 rounded-lg w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-800 rounded-lg w-1/4 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto my-16 px-6 text-center space-y-6 select-none">
        <div className="w-16 h-16 mx-auto bg-[#12121E] border border-gray-800 rounded-2xl flex items-center justify-center text-gray-500 shadow-xl">
          <Lock size={28} className="text-[#FF6584]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Connect your Account</h2>
          <p className="text-sm text-gray-400">Sign in to view and play your custom cloud playlists.</p>
        </div>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="w-full py-3 bg-[#6C63FF] text-white text-sm font-bold uppercase rounded-xl transition duration-200"
        >
          Sign In
        </button>
      </div>
    )
  }

  if (isError || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <ListMusic size={48} className="text-red-400" />
        <p className="text-gray-400 font-semibold">Could not load playlist.</p>
        <button onClick={() => router.push("/library")} className="px-4 py-2 bg-[#6C63FF] rounded-lg text-xs font-bold text-white hover:opacity-90">
          Return to Library
        </button>
      </div>
    )
  }

  return (
    <div className="relative min-h-full select-none">
      {/* Blurred decorative layer */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-[#FF6584]/5 blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-6 pb-36 md:pb-12 space-y-8">
        {/* Back navigation */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold mb-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Top Banner Grid */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Cover Placeholder */}
          <div className="w-64 h-64 rounded-3xl overflow-hidden bg-gradient-to-tr from-[#6C63FF]/30 to-[#FF6584]/20 border border-[#6C63FF33] shadow-2xl flex-shrink-0 flex items-center justify-center relative group">
            <ListMusic size={96} className="text-white opacity-90 group-hover:scale-105 transition duration-300" />
            
            {songsList.length > 0 && (
              <div 
                onClick={() => handlePlayAll(false)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300 cursor-pointer"
              >
                <div className="w-14 h-14 bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition duration-300 shadow-lg">
                  <Play size={24} className="fill-white ml-1 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Info Block */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#FF6584] font-bold">
              User Playlist
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {playlist.name}
            </h2>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-400 font-medium">
              <span className="font-semibold text-white">
                By {session?.user?.name || "User"}
              </span>
              <span className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
              <span>{songsList.length} Curated Tracks</span>
            </div>

            {/* Play actions */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {songsList.length > 0 && (
                <>
                  <button
                    onClick={() => handlePlayAll(false)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider rounded-full transition duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play size={14} className="fill-black" />
                    Play Playlist
                  </button>
                  <button
                    onClick={() => handlePlayAll(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider rounded-full border border-white/10 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Shuffle size={14} />
                    Shuffle
                  </button>
                </>
              )}
              <button
                onClick={handleDeletePlaylist}
                disabled={deletePlaylistMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider rounded-full border border-red-500/20 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                title="Delete Playlist"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Songs List Column */}
        <div className="pt-4 space-y-4">
          <h3 className="text-xl font-bold text-white border-b border-gray-900/60 pb-3">
            Playlist Tracks
          </h3>

          {songsList.length === 0 ? (
            <div className="text-center py-20 bg-[#12121E]/30 rounded-3xl border border-[#6C63FF11] flex flex-col items-center justify-center gap-3 text-gray-500">
              <Music size={40} className="text-gray-700 animate-pulse" />
              <p className="text-sm font-semibold">This playlist has no songs yet</p>
              <p className="text-xs max-w-xs mx-auto">Navigate to Discover or Search, play your favorite tracks, and add them to this playlist instantly!</p>
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
                      playlistId={playlist.id}
                      onSongSelected={handlePlaySong}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PlaylistDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-[#6C63FF]" />
      </div>
    }>
      <PlaylistDetailsContent />
    </Suspense>
  )
}
