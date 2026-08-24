"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Play, Pause, Heart, Disc, Trash2 } from "lucide-react"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import SongContextMenu from "@/components/SongContextMenu"
import toast from "react-hot-toast"

interface SongPillProps {
  song: Song
  index?: number
  playlistId?: string // If present, shows option to remove song from this playlist
  onSongSelected?: (song: Song) => void
}

export default function SongPill({ song, playlistId, onSongSelected }: SongPillProps) {
  const [imgFailed, setImgFailed] = React.useState(false)
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const play = usePlayerStore((state) => state.play)
  const pause = usePlayerStore((state) => state.pause)
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)

  if (!song) return null

  const isCurrent = currentSong?.id === song.id

  interface LikedSongData {
    songId: string
  }

  // Fetch liked songs to check if this track is liked
  const { data: likedSongs } = useQuery<LikedSongData[]>({
    queryKey: ["likedSongs"],
    queryFn: async () => {
      const res = await fetch("/api/library/likes")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session,
  })

  const isLiked = likedSongs?.some((ls) => ls.songId === song.id) || false

  // Toggle Like Mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/library/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: song.id,
          songName: song.name,
          artist: song.artist,
          image: song.image,
          streamUrl: song.streamUrl,
          duration: song.duration,
        }),
      })
      if (!res.ok) throw new Error("Failed to update liked song")
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["likedSongs"] })
      if (data.liked) {
        toast.success(`Liked "${song.name}"!`)
      } else {
        toast.success(`Removed "${song.name}" from likes.`)
      }
    },
    onError: () => {
      toast.error("Could not update library")
    },
  })

  // Remove Song from Playlist Mutation
  const removeSongMutation = useMutation({
    mutationFn: async () => {
      if (!playlistId) return
      const res = await fetch(`/api/library/playlists/songs?playlistId=${playlistId}&songId=${song.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove song from playlist")
      return res.json()
    },
    onSuccess: () => {
      toast.success(`Removed "${song.name}" from playlist.`)
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] })
    },
    onError: () => {
      toast.error("Could not remove song")
    },
  })

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrent) {
      if (isPlaying) {
        pause()
      } else {
        play()
      }
    } else {
      // If the song does not have a streamUrl (e.g. search top item), resolve it dynamically!
      if (!song.streamUrl && song.url) {
        const resolveToast = toast.loading(`Resolving audio stream...`)
        try {
          const res = await fetch(`/api/song?link=${encodeURIComponent(song.url)}`)
          if (!res.ok) throw new Error()
          const detailedSong = await res.json()
          
          toast.dismiss(resolveToast)
          if (onSongSelected) {
            onSongSelected(detailedSong)
          } else {
            setQueue([detailedSong], 0)
          }
          return
        } catch {
          toast.dismiss(resolveToast)
          toast.error("Could not load song stream.")
          return
        }
      }

      if (onSongSelected) {
        onSongSelected(song)
      } else {
        setQueue([song], 0)
      }
    }
  }

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!session) {
      setAuthModalOpen(true)
    } else {
      toggleLikeMutation.mutate()
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeSongMutation.mutate()
  }

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  if (imgFailed) return null

  return (
    <div 
      onClick={handlePlayClick}
      className={`group flex items-center justify-between gap-4 p-2.5 sm:p-3 bg-white/[0.025] hover:bg-white/[0.06] border rounded-xl transition-all duration-200 cursor-pointer ${
        isCurrent
          ? "border-white/25 bg-white/[0.06] shadow-sm shadow-black/30"
          : "border-white/[0.06] hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Index or Cover Image */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-lg overflow-hidden bg-[#161722] flex items-center justify-center border border-white/[0.06]">
          {song.image ? (
            <img src={song.image} alt={song.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={() => setImgFailed(true)} />
          ) : (
            <Disc size={18} className="text-white/30" />
          )}

          {/* Hover Overlay Button */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
            {isCurrent && isPlaying ? (
              <Pause size={16} className="text-white fill-white" />
            ) : (
              <Play size={16} className="text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-white/90 group-hover:text-white"}`}>
              {song.name}
            </span>
            {isCurrent && isPlaying && (
              <div className="eq-container">
                <span className="eq-bar-1"></span>
                <span className="eq-bar-2"></span>
                <span className="eq-bar-3"></span>
              </div>
            )}
          </div>
          <span className="text-xs text-white/50 block truncate group-hover:text-white/70 transition-colors">
            {song.artist}
          </span>
        </div>
      </div>

      {/* Track Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Song duration */}
        <span className="text-xs text-white/40 mr-2 hidden sm:inline tabular-nums">
          {formatTime(song.duration)}
        </span>

        {/* Like Button */}
        <button 
          onClick={handleLikeClick}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
            isLiked ? "text-[#ec4899]" : "text-white/40 hover:text-white"
          }`}
          title={isLiked ? "Unlike Song" : "Like Song"}
        >
          <Heart size={15} className={isLiked ? "fill-[#ec4899]" : ""} />
        </button>

        {/* Remove Button if inside playlist, else let SongContextMenu handle custom add-to-playlist */}
        {playlistId && (
          <button 
            onClick={handleRemoveClick}
            disabled={removeSongMutation.isPending}
            className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Remove from Playlist"
          >
            <Trash2 size={15} />
          </button>
        )}

        <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex-shrink-0">
          <SongContextMenu song={song} />
        </div>
      </div>
    </div>
  )
}
