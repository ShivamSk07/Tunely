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
          className="w-full py-3 bg-white hover:bg-white/90 text-black text-sm font-bold uppercase tracking-wider rounded-xl transition duration-200 shadow-md hover:scale-[1.01]"
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-36 md:pb-12 space-y-4 md:space-y-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 border-b border-white/[0.06] pb-4 md:pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
            <Library size={18} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Your Music Library</h2>
            <p className="text-xs text-white/50 hidden sm:block">Manage your playlists and saved tracks.</p>
          </div>
        </div>

        {/* Create playlist action */}
        {activeTab === "playlists" && (
          <button
            onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 shadow-sm hover:scale-[1.01] w-full sm:w-auto"
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
          className="p-5 md:p-6 rounded-2xl bg-[#12131c] border border-white/10 space-y-4 max-w-xl mx-auto shadow-lg"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Playlist details</h3>
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider block">Playlist Title</label>
            <input
              type="text"
              required
              value={playlistTitle}
              onChange={(e) => setPlaylistTitle(e.target.value)}
              placeholder="e.g. Chill Vibes"
              className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-white/30 outline-none text-white rounded-xl text-sm transition"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider block">Description (Optional)</label>
            <textarea
              value={playlistDesc}
              onChange={(e) => setPlaylistDesc(e.target.value)}
              placeholder="Give your playlist a description..."
              rows={2}
              className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-white/30 outline-none text-white rounded-xl text-sm transition"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createPlaylistMutation.isPending}
              className="px-4 py-2 bg-white text-black hover:bg-white/90 disabled:opacity-50 text-xs font-bold rounded-lg transition"
            >
              {createPlaylistMutation.isPending ? "Creating..." : "Save Playlist"}
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingPlaylist(false)}
              className="px-4 py-2 bg-white/10 text-white/70 hover:text-white text-xs font-bold rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab("likes")}
          className={`py-2.5 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition duration-200 ${
            activeTab === "likes"
              ? "border-white text-white"
              : "border-transparent text-white/40 hover:text-white"
          }`}
        >
          Liked Songs ({likedSongs.length})
        </button>
        <button
          onClick={() => setActiveTab("playlists")}
          className={`py-2.5 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition duration-200 ${
            activeTab === "playlists"
              ? "border-white text-white"
              : "border-transparent text-white/40 hover:text-white"
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
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 shadow-sm w-fit"
            >
              <Play size={14} className="fill-black text-black" />
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
            <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/[0.06] flex flex-col items-center justify-center gap-3 text-white/40">
              <FolderHeart size={40} className="text-white/20" />
              <p className="text-sm font-semibold text-white/70">No liked songs yet</p>
              <p className="text-xs max-w-sm">Tap the heart icon on any track to save it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 bg-white/[0.03] border border-white/[0.06] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/[0.06] flex flex-col items-center justify-center gap-3 text-white/40">
              <Disc2 size={40} className="text-white/20" />
              <p className="text-sm font-semibold text-white/70">No playlists created</p>
              <p className="text-xs max-w-sm">Create a new playlist above and start organizing your favorite music.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist?id=${playlist.id}`}
                  onMouseEnter={() => handlePrefetchPlaylist(playlist.id)}
                  className="group flex flex-col justify-between bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 p-5 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all duration-200 relative block text-left font-normal shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-200">
                      <Music size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-white transition-colors truncate block">{playlist.name}</h4>
                      <p className="text-xs text-white/40 line-clamp-2 mt-0.5">Custom Playlist</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5 mt-5">
                    <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
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
