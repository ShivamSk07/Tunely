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
  const [imgFailed, setImgFailed] = React.useState(false)
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

  if (imgFailed) return null

  return (
    <div 
      onClick={handlePlayClick}
      className={`group relative flex flex-col p-3.5 md:p-4 bg-white/[0.025] hover:bg-white/[0.06] border rounded-2xl cursor-pointer transition-all duration-200 ${
        isCurrent
          ? "border-white/25 bg-white/[0.06] shadow-md shadow-black/40"
          : "border-white/[0.07] hover:border-white/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/50"
      }`}
    >
      {/* Cover Image */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#161722] border border-white/[0.06] flex items-center justify-center">
        {song.image ? (
          <img 
            src={song.image} 
            alt={song.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Disc size={36} className="text-white/30" />
        )}

        {/* Hover circular overlay glassmorphism play button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
          <div className="w-11 h-11 bg-white text-black rounded-full flex items-center justify-center scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg hover:scale-105 active:scale-95">
            {isCurrent && isPlaying ? (
              <Pause size={18} className="fill-black text-black" />
            ) : (
              <Play size={18} className="fill-black ml-0.5 text-black" />
            )}
          </div>
        </div>

        {/* Floating Actions on Cover hover (Top Right) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 z-10">
          <button 
            onClick={handleLikeClick}
            className={`w-7 h-7 rounded-lg bg-black/70 hover:bg-black/90 flex items-center justify-center border border-white/10 transition-colors ${
              isLiked ? "text-[#ec4899]" : "text-gray-300 hover:text-white"
            }`}
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart size={13} className={isLiked ? "fill-[#ec4899]" : ""} />
          </button>
          
          <div onClick={(e) => e.stopPropagation()}>
            <SongContextMenu song={song} className="w-7 h-7 bg-black/70 hover:bg-black/90 rounded-lg flex items-center justify-center border border-white/10 text-white/80 hover:text-white" />
          </div>
        </div>
      </div>

      {/* Info details */}
      <div className="mt-3.5 space-y-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold truncate block flex-1 ${
            isCurrent ? "text-white font-bold" : "text-white/90 group-hover:text-white transition-colors"
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
        
        <span className="text-xs text-white/50 truncate block group-hover:text-white/70 transition-colors">
          {song.artist}
        </span>
      </div>
    </div>
  )
}
