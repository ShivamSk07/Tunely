"use client"

import React, { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Library, Plus, FolderHeart, Music, Loader2, 
  Trash2, Play, Lock, Disc2
} from "lucide-react"
import SongPill from "@/components/SongPill"
import { SongPillSkeleton } from "@/components/LoaderSkeleton"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

type ActiveTab = "likes" | "playlists"

export default function LibraryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const setQueue = usePlayerStore((state) => state.setQueue)
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)

  const [activeTab, setActiveTab] = useState<ActiveTab>("likes")
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [playlistTitle, setPlaylistTitle] = useState("")
  const [playlistDesc, setPlaylistDesc] = useState("")

  const handlePrefetchPlaylist = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["playlist", id],
      queryFn: async () => {
        const res = await fetch(`/api/library/playlists?id=${id}`)
        if (!res.ok) throw new Error("Failed to fetch playlist")
        return res.json()
      },
      staleTime: 300000,
    })
  }

  interface LikedSong {
    songId: string
    songName: string
    artist: string
    image: string
    streamUrl: string
    duration?: number
  }

  // Fetch Liked Songs from database
  const { data: likedSongs = [], isLoading: isLikesLoading } = useQuery<LikedSong[]>({
    queryKey: ["likedSongs"],
    queryFn: async (): Promise<LikedSong[]> => {
      const res = await fetch("/api/library/likes")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session,
  })

  interface LibraryPlaylist {
    id: string
    name: string
    _count?: {
      songs: number
    }
  }

  // Fetch Playlists from database
  const { data: playlists = [], isLoading: isPlaylistsLoading } = useQuery<LibraryPlaylist[]>({
    queryKey: ["playlists"],
    queryFn: async (): Promise<LibraryPlaylist[]> => {
      const res = await fetch("/api/library/playlists")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session,
  })

  // Create Playlist Mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/library/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playlistTitle }),
      })
      if (!res.ok) throw new Error("Failed to create playlist")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Playlist created successfully!")
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
      setPlaylistTitle("")
      setPlaylistDesc("")
      setIsCreatingPlaylist(false)
    },
    onError: () => {
      toast.error("Could not create playlist")
    },
  })

  // Delete Playlist Mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/library/playlists?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete playlist")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Playlist deleted.")
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
    },
    onError: () => {
      toast.error("Could not delete playlist")
    },
  })

  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistTitle.trim()) {
      toast.error("Playlist title is required")
      return
    }
    createPlaylistMutation.mutate()
  }

  const handlePlayLikes = () => {
    if (likedSongs.length === 0) return
    const formatted: Song[] = likedSongs.map((ls) => ({
      id: ls.songId,
      name: ls.songName,
      artist: ls.artist,
      image: ls.image,
      streamUrl: ls.streamUrl,
      duration: ls.duration || 180,
    }))
    setQueue(formatted, 0)
  }

  const handlePlayLikedSong = (song: Song) => {
    const formatted: Song[] = likedSongs.map((ls) => ({
      id: ls.songId,
      name: ls.songName,
      artist: ls.artist,
      image: ls.image,
      streamUrl: ls.streamUrl,
      duration: ls.duration || 180,
    }))
    const idx = formatted.findIndex((s) => s.id === song.id)
    setQueue(formatted, idx === -1 ? 0 : idx)
  }

  // Handle Loading authentication state
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <Loader2 size={36} className="text-[#6C63FF] animate-spin" />
        <p className="text-gray-400 text-sm">Authenticating session...</p>
      </div>
    )
  }

  // Gated Authentication view
  if (!session) {
    return (
      <div className="max-w-md mx-auto my-16 px-6 text-center space-y-6 select-none select-none animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto bg-[#12121E] border border-gray-800 rounded-2xl flex items-center justify-center text-gray-500 shadow-xl">
          <Lock size={28} className="text-[#FF6584]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Connect your Account
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your liked tracks, listening patterns, and curated music libraries are stored securely inside our PostgreSQL database. Connect now to unlock!
          </p>
        </div>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition duration-200 purple-glow hover:scale-[1.02]"
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-36 md:pb-12 space-y-4 md:space-y-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 border-b border-gray-900/60 pb-4 md:pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center text-[#6C63FF]">
            <Library size={18} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Your Music Library</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Manage playlists and tracks synchronized in Neon Database.</p>
          </div>
        </div>

        {/* Create playlist action */}
        {activeTab === "playlists" && (
          <button
            onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 purple-glow hover:scale-[1.02] w-full sm:w-auto"
          >
            <Plus size={16} />
            Create Playlist
          </button>
        )}
      </div>

      {/* Slide-out/Toggle Playlist Creator Panel */}
      {isCreatingPlaylist && activeTab === "playlists" && (
        <form 
          onSubmit={handleCreatePlaylistSubmit}
          className="p-6 rounded-2xl bg-[#12121E] border border-[#6C63FF33] space-y-4 max-w-xl mx-auto purple-glow"
        >
          <h3 className="text-md font-bold text-white">New Playlist details</h3>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Playlist Title</label>
            <input
              type="text"
              required
              value={playlistTitle}
              onChange={(e) => setPlaylistTitle(e.target.value)}
              placeholder="e.g. Chill Vibes"
              className="w-full px-4 py-2.5 bg-[#080810] border border-gray-800 focus:border-[#6C63FF] outline-none text-white rounded-xl text-sm transition"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Description (Optional)</label>
            <textarea
              value={playlistDesc}
              onChange={(e) => setPlaylistDesc(e.target.value)}
              placeholder="Give your playlist a description..."
              rows={2}
              className="w-full px-4 py-2.5 bg-[#080810] border border-gray-800 focus:border-[#6C63FF] outline-none text-white rounded-xl text-sm transition"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createPlaylistMutation.isPending}
              className="px-4 py-2 bg-[#6C63FF] hover:bg-[#6C63FF]/90 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
            >
              {createPlaylistMutation.isPending ? "Creating..." : "Save Playlist"}
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingPlaylist(false)}
              className="px-4 py-2 bg-gray-800 text-gray-300 hover:text-white text-xs font-bold rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Horizontal Tabs Row */}
      <div className="flex border-b border-gray-900/60 max-w-xs mx-auto sm:mx-0 justify-around sm:justify-start sm:gap-6">
        <button
          onClick={() => setActiveTab("likes")}
          className={`py-2.5 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition duration-200 ${
            activeTab === "likes"
              ? "border-[#FF6584] text-[#FF6584]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Liked Tracks ({likedSongs.length})
        </button>
        <button
          onClick={() => setActiveTab("playlists")}
          className={`py-2.5 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition duration-200 ${
            activeTab === "playlists"
              ? "border-[#6C63FF] text-[#6C63FF]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Playlists ({playlists.length})
        </button>
      </div>

      {/* LIKED SONGS TAB DETAILS */}
      {activeTab === "likes" && (
        <div className="space-y-4">
          {likedSongs.length > 0 && (
            <button
              onClick={handlePlayLikes}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#6C63FF] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 purple-glow w-fit"
            >
              <Play size={14} className="fill-white" />
              Play Likes
            </button>
          )}

          {isLikesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SongPillSkeleton key={i} />
              ))}
            </div>
          ) : likedSongs.length === 0 ? (
            <div className="text-center py-20 bg-[#12121E]/30 rounded-3xl border border-[#6C63FF11] flex flex-col items-center justify-center gap-3 text-gray-500">
              <FolderHeart size={48} className="text-gray-700 animate-pulse" />
              <p className="text-sm font-semibold">No liked songs yet</p>
              <p className="text-xs max-w-sm">Tap the heart icon on any song pill or the bottom player bar to save your favorite songs!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {likedSongs.map((ls) => {
                const song: Song = {
                  id: ls.songId,
                  name: ls.songName,
                  artist: ls.artist,
                  image: ls.image,
                  streamUrl: ls.streamUrl,
                  duration: ls.duration || 180,
                }
                return (
                  <SongPill
                    key={song.id}
                    song={song}
                    onSongSelected={handlePlayLikedSong}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* PLAYLISTS TAB DETAILS */}
      {activeTab === "playlists" && (
        <div className="space-y-4">
          {isPlaylistsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-20 bg-[#12121E]/30 rounded-3xl border border-[#6C63FF11] flex flex-col items-center justify-center gap-3 text-gray-500">
              <Disc2 size={48} className="text-gray-700 animate-pulse" />
              <p className="text-sm font-semibold">No playlists created</p>
              <p className="text-xs max-w-sm">Create a new playlist above and start cataloguing your favorite listening vibes!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist?id=${playlist.id}`}
                  onMouseEnter={() => handlePrefetchPlaylist(playlist.id)}
                  className="group flex flex-col justify-between bg-[#12121E] border border-[#6C63FF22] p-5 rounded-2xl cursor-pointer hover:border-[#6C63FF88] hover:-translate-y-1 transition-all duration-300 relative purple-glow-hover block text-left font-normal"
                >
                  <div className="space-y-3">
                    {/* Folder cover visual */}
                    <div className="w-10 h-10 rounded-lg bg-[#FF6584]/10 flex items-center justify-center text-[#FF6584] group-hover:scale-105 transition-transform duration-300">
                      <Music size={20} />
                    </div>
                    <div>
                      <h4 className="text-md font-bold text-white group-hover:text-[#FF6584] transition-colors truncate block">{playlist.name}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">Curated Cloud Playlist</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-900/60 pt-4 mt-6">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {playlist._count?.songs || 0} tracks
                    </span>
                    
                    {/* Delete button (stop propagation) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
                          deletePlaylistMutation.mutate(playlist.id)
                        }
                      }}
                      className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-red-400 rounded-lg transition"
                      title="Delete Playlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
