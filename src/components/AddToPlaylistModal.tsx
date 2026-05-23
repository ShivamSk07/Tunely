"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { X, Plus, FolderPlus, Disc, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface AddToPlaylistModalProps {
  song: {
    id: string
    name: string
    artist: string
    image: string
    streamUrl: string
    duration: number
  } | null
  onClose: () => void
}

export default function AddToPlaylistModal({ song, onClose }: AddToPlaylistModalProps) {
  const queryClient = useQueryClient()
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  interface PlaylistData {
    id: string
    name: string
    image?: string
    _count?: {
      songs: number
    }
  }

  // Fetch user playlists
  const { data: playlists, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: async (): Promise<PlaylistData[]> => {
      const res = await fetch("/api/library/playlists")
      if (!res.ok) throw new Error("Failed to fetch playlists")
      return res.json()
    },
    enabled: !!song,
  })

  // Add song to playlist mutation
  const addSongMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      if (!song) return
      const res = await fetch("/api/library/playlists/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          songId: song.id,
          songName: song.name,
          artist: song.artist,
          image: song.image,
          streamUrl: song.streamUrl,
          duration: song.duration,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add song to playlist")
      return data
    },
    onSuccess: () => {
      toast.success("Added to playlist!")
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add song")
    },
  })

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/library/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create playlist")
      return data
    },
    onSuccess: (data) => {
      toast.success("Playlist created!")
      setNewPlaylistName("")
      setIsCreating(false)
      queryClient.invalidateQueries({ queryKey: ["playlists"] })
      // Auto add song to this new playlist
      if (song && data.data?.id) {
        addSongMutation.mutate(data.data.id)
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create playlist")
    },
  })

  if (!song) return null

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    createPlaylistMutation.mutate(newPlaylistName.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="w-full max-w-md bg-[#12121E] border border-[#6C63FF22] rounded-2xl purple-glow overflow-hidden p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
          <h3 className="text-lg font-bold text-white">Add to Playlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Selected Song Preview */}
        <div className="flex items-center gap-3 bg-[#080810] p-3 rounded-xl border border-gray-800/40 mb-6">
          {song.image ? (
            <img src={song.image} alt={song.name} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
              <Disc size={20} className="text-[#6C63FF]" />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{song.name}</p>
            <p className="text-xs text-gray-400 truncate">{song.artist}</p>
          </div>
        </div>

        {/* Create playlist Toggle */}
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 w-full py-3 mb-4 border border-[#6C63FF44] hover:bg-[#6C63FF11] text-[#6C63FF] hover:text-white rounded-xl transition duration-200 text-sm font-medium"
          >
            <Plus size={16} />
            Create New Playlist
          </button>
        ) : (
          <form onSubmit={handleCreatePlaylist} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                required
                className="flex-1 px-4 py-2 bg-[#080810] border border-gray-800 focus:border-[#6C63FF] outline-none text-white rounded-xl text-sm"
              />
              <button
                type="submit"
                disabled={createPlaylistMutation.isPending}
                className="px-4 py-2 bg-[#6C63FF] hover:bg-[#574AE2] text-white rounded-xl text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                {createPlaylistMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Create"
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-[#6C63FF] animate-spin" />
            </div>
          ) : !playlists || playlists.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm flex flex-col items-center justify-center gap-2">
              <FolderPlus size={32} className="text-gray-600" />
              <span>No playlists created yet.</span>
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => addSongMutation.mutate(playlist.id)}
                disabled={addSongMutation.isPending}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-[#6C63FF11] border border-transparent hover:border-[#6C63FF22] transition duration-200 text-left"
              >
                {playlist.image ? (
                  <img src={playlist.image} alt={playlist.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Disc size={16} className="text-[#6C63FF]" />
                  </div>
                )}
                <div className="flex-grow">
                  <p className="text-sm font-semibold text-white">{playlist.name}</p>
                  <p className="text-xs text-gray-400">
                    {playlist._count?.songs || 0} {playlist._count?.songs === 1 ? "song" : "songs"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
