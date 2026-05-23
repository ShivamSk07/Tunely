"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  MoreVertical, 
  Play, 
  ListPlus, 
  Heart, 
  ListMusic, 
  Share2, 
  ArrowRightToLine,
  X
} from "lucide-react"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

interface SongContextMenuProps {
  song: Song
  className?: string
}

export default function SongContextMenu({ song, className = "" }: SongContextMenuProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const setQueue = usePlayerStore((state) => state.setQueue)
  const playNext = usePlayerStore((state) => state.playNext)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)

  interface LikedSongData {
    songId: string
  }

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
      if (!res.ok) throw new Error()
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

  // Close dropdown on click outside (desktop only)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.innerWidth < 769) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handlePlayNow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    
    let finalSong = song
    if (!song.streamUrl) {
      const resolveToast = toast.loading("Resolving song details...")
      try {
        const res = await fetch(`/api/song?id=${song.id}`)
        if (res.ok) {
          finalSong = await res.json()
          toast.dismiss(resolveToast)
        } else {
          throw new Error()
        }
      } catch {
        toast.dismiss(resolveToast)
        toast.error("Failed to load audio stream.")
        return
      }
    }

    setQueue([finalSong], 0)
    toast.success(`Playing "${song.name}" now`)
  }

  const handlePlayNext = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)

    let finalSong = song
    if (!song.streamUrl) {
      const resolveToast = toast.loading("Resolving song details...")
      try {
        const res = await fetch(`/api/song?id=${song.id}`)
        if (res.ok) {
          finalSong = await res.json()
          toast.dismiss(resolveToast)
        } else {
          throw new Error()
        }
      } catch {
        toast.dismiss(resolveToast)
        toast.error("Failed to load audio stream.")
        return
      }
    }

    playNext(finalSong)
    toast.success(`"${song.name}" will play next`)
  }

  const handleAddToQueue = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)

    let finalSong = song
    if (!song.streamUrl) {
      const resolveToast = toast.loading("Resolving song details...")
      try {
        const res = await fetch(`/api/song?id=${song.id}`)
        if (res.ok) {
          finalSong = await res.json()
          toast.dismiss(resolveToast)
        } else {
          throw new Error()
        }
      } catch {
        toast.dismiss(resolveToast)
        toast.error("Failed to load audio stream.")
        return
      }
    }

    addToQueue(finalSong)
    toast.success(`Added "${song.name}" to queue`)
  }


  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    if (!session) {
      setAuthModalOpen(true)
    } else {
      toggleLikeMutation.mutate()
    }
  }

  const handleAddToPlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    if (!session) {
      setAuthModalOpen(true)
    } else {
      const event = new CustomEvent("trigger-add-to-playlist", { detail: song })
      window.dispatchEvent(event)
    }
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    const shareUrl = `${window.location.origin}/song?id=${song.id}`
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success("Song link copied to clipboard!"))
      .catch(() => toast.error("Could not copy link."))
  }

  const menuItems = [
    { icon: <Play size={18} className="text-[#6C63FF]" />, label: "Play Now", handler: handlePlayNow },
    { icon: <ArrowRightToLine size={18} className="text-[#6C63FF]" />, label: "Play Next", handler: handlePlayNext },
    { icon: <ListPlus size={18} className="text-[#6C63FF]" />, label: "Add to Queue", handler: handleAddToQueue },
    { divider: true },
    { icon: <Heart size={18} className={isLiked ? "text-[#FF6584] fill-[#FF6584]" : "text-[#FF6584]"} />, label: isLiked ? "Liked Song" : "Like Song", handler: handleLikeClick },
    { icon: <ListMusic size={18} className="text-[#6C63FF]" />, label: "Add to Playlist", handler: handleAddToPlaylistClick },
    { icon: <Share2 size={18} className="text-white/50" />, label: "Share Song", handler: handleShareClick },
  ]

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
        title="More options"
      >
        <MoreVertical size={16} />
      </button>

      {/* ── DESKTOP DROPDOWN ── */}
      {isOpen && (
        <div className="hidden md:block absolute right-0 mt-2 w-52 bg-[#0E0E18]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[999] py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {menuItems.map((item, idx) =>
            item.divider ? (
              <div key={idx} className="h-px bg-white/5 my-1" />
            ) : (
              <button
                key={idx}
                onClick={item.handler}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-200 hover:text-white hover:bg-[#6C63FF]/20 transition-all text-left"
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}

      {/* ── MOBILE BOTTOM SHEET ── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-[999] flex flex-col justify-end"
          onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Sheet */}
          <div
            className="relative rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ background: "rgba(18,18,30,0.98)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Song header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
              <img src={song.image} alt={song.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{song.name}</p>
                <p className="text-xs text-white/50 truncate">{song.artist}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50"
              >
                <X size={14} />
              </button>
            </div>

            {/* Menu items */}
            <div className="py-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
              {menuItems.map((item, idx) =>
                item.divider ? (
                  <div key={idx} className="h-px bg-white/5 mx-5 my-1" />
                ) : (
                  <button
                    key={idx}
                    onClick={item.handler}
                    className="w-full px-5 flex items-center gap-4 text-gray-200 hover:text-white hover:bg-white/5 transition-all text-left"
                    style={{ height: "56px" }}
                  >
                    {item.icon}
                    <span className="text-[15px] font-medium">{item.label}</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
