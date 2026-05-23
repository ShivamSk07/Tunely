"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Play, Pause, Heart, Disc } from "lucide-react"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import SongContextMenu from "@/components/SongContextMenu"
import toast from "react-hot-toast"

interface SongCardProps {
  song: Song
  onSongSelected?: (song: Song) => void
}

export default function SongCard({ song, onSongSelected }: SongCardProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const play = usePlayerStore((state) => state.play)
  const pause = usePlayerStore((state) => state.pause)
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)

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
        toast.success(`Added "${song.name}" to Likes!`)
      } else {
        toast.success(`Removed "${song.name}" from Likes.`)
      }
    },
    onError: () => {
      toast.error("Could not update liked songs")
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

  return (
    <div 
      onClick={handlePlayClick}
      className={`group relative flex flex-col p-4 bg-[#12121E]/60 border border-[#6C63FF11] rounded-2xl cursor-pointer hover:border-[#6C63FF33] hover:bg-[#12121E]/90 transition-all duration-300 purple-glow-hover ${
        isCurrent ? "border-[#FF6584]/30 bg-[#12121E]/80 active-glow" : ""
      }`}
    >
      {/* Cover Image */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#080810] border border-gray-800 flex items-center justify-center">
        {song.image ? (
          <img 
            src={song.image} 
            alt={song.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <Disc size={40} className="text-[#6C63FF] animate-pulse" />
        )}

        {/* Hover circular overlay glassmorphism play button */}
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg hover:scale-105 hover:bg-[#6C63FF] hover:border-[#6C63FF]">
            {isCurrent && isPlaying ? (
              <Pause size={20} className="fill-white text-white" />
            ) : (
              <Play size={20} className="fill-white ml-0.5 text-white" />
            )}
          </div>
        </div>

        {/* Floating Actions on Cover hover (Top Right) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 z-10">
          <button 
            onClick={handleLikeClick}
            className={`w-8 h-8 rounded-lg bg-black/60 hover:bg-black/90 flex items-center justify-center border border-white/10 transition-colors ${
              isLiked ? "text-[#FF6584]" : "text-gray-300 hover:text-white"
            }`}
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart size={14} className={isLiked ? "fill-[#FF6584]" : ""} />
          </button>
          
          <div onClick={(e) => e.stopPropagation()}>
            <SongContextMenu song={song} className="w-8 h-8 bg-black/60 hover:bg-black/90 rounded-lg flex items-center justify-center border border-white/10" />
          </div>
        </div>
      </div>

      {/* Info details */}
      <div className="mt-4 space-y-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold truncate block flex-1 ${
            isCurrent ? "text-[#FF6584]" : "text-white group-hover:text-[#6C63FF] transition-colors"
          }`}>
            {song.name}
          </span>
          
          {isCurrent && isPlaying && (
            <div className="eq-container flex-shrink-0 mb-0.5">
              <span className="eq-bar-1"></span>
              <span className="eq-bar-2"></span>
              <span className="eq-bar-3"></span>
            </div>
          )}

          <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex-shrink-0">
            <SongContextMenu song={song} />
          </div>
        </div>
        
        <span className="text-xs text-gray-400 truncate block group-hover:text-gray-300 transition-colors">
          {song.artist}
        </span>
      </div>
    </div>
  )
}
