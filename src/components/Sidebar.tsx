"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Home, Search, Library, Heart, Plus, 
  Disc, ListMusic, Clock, Settings, BarChart2
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { usePlayerStore } from "@/store/usePlayerStore"
import Logo from "@/components/Logo"

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)

  React.useEffect(() => {
    router.prefetch("/search")
    router.prefetch("/charts")
    router.prefetch("/playlists")
    router.prefetch("/library")
    router.prefetch("/settings")
  }, [router])

  interface PlaylistData {
    id: string
    name: string
    _count?: {
      songs: number
    }
  }

  const { data: playlists = [] } = useQuery<PlaylistData[]>({
    queryKey: ["playlists"],
    queryFn: async () => {
      const res = await fetch("/api/library/playlists")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session,
  })

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

  const mainLinks = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Charts", icon: BarChart2, href: "/charts" },
    { label: "Playlists", icon: ListMusic, href: "/playlists" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 hidden md:flex flex-col bg-[#0a0a0f] border-r border-white/5"
      style={{ width: "var(--sidebar-width)", paddingBottom: "var(--player-height)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-6 flex-shrink-0">
        <Logo size={32} />
        <span className="text-xl font-black text-white tracking-tight">Tunely</span>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 space-y-1 flex-shrink-0">
        {mainLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-[#B3B3B3] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Library Section */}
      <div className="mt-4 flex-1 flex flex-col min-h-0 bg-[#121212] rounded-xl mx-2 overflow-hidden">
        {/* Library header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <Link
            href="/library"
            className={`flex items-center gap-2.5 text-sm font-bold transition-colors ${
              pathname === "/library" ? "text-white" : "text-[#B3B3B3] hover:text-white"
            }`}
          >
            <Library size={20} />
            Your Library
          </Link>
          {session && (
            <button
              onClick={() => {
                const event = new CustomEvent("trigger-create-playlist")
                window.dispatchEvent(event)
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-all"
              title="Create Playlist"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Library Items */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {!session ? (
            /* Not signed in — promo card */
            <div className="mx-2 mt-2 p-4 bg-[#242424] rounded-xl space-y-3">
              <p className="text-sm font-bold text-white">Create your first playlist</p>
              <p className="text-xs text-[#B3B3B3]">{"It's easy, we'll help you"}</p>
              <button
                onClick={() => {
                  const event = new CustomEvent("trigger-auth")
                  window.dispatchEvent(event)
                }}
                className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:scale-105 transition-transform"
              >
                Create playlist
              </button>
            </div>
          ) : (
            <>
              {/* Liked Songs */}
              <Link
                href="/library"
                className={`flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group ${
                  pathname === "/library" ? "bg-white/5" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#4B0082] to-[#6C63FF] flex items-center justify-center flex-shrink-0">
                  <Heart size={14} className="text-white fill-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">Liked Songs</p>
                  <p className="text-xs text-[#B3B3B3]">Playlist</p>
                </div>
              </Link>

              {/* Recently Played */}
              <Link
                href="/library"
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#1DB954] to-[#155e35] flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">Recent Plays</p>
                  <p className="text-xs text-[#B3B3B3]">Playlist</p>
                </div>
              </Link>

              {/* User Playlists */}
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist?id=${playlist.id}`}
                  onMouseEnter={() => handlePrefetchPlaylist(playlist.id)}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-md bg-[#282828] flex items-center justify-center flex-shrink-0 border border-white/5">
                    <ListMusic size={14} className="text-[#B3B3B3]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
                    <p className="text-xs text-[#B3B3B3]">Playlist • {playlist._count?.songs || 0} songs</p>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Now Playing Mini at bottom of sidebar */}
      {currentSong && (
        <div className="mx-2 mb-2 mt-1 p-3 bg-[#1a1a2e] rounded-xl border border-white/5 flex items-center gap-2.5 flex-shrink-0">
          <img
            src={currentSong.image}
            alt={currentSong.name}
            className="w-9 h-9 rounded-md object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{currentSong.name}</p>
            <p className="text-[10px] text-[#B3B3B3] truncate">{currentSong.artist}</p>
          </div>
          <div className="eq-container flex-shrink-0">
            {isPlaying ? (
              <>
                <span className="eq-bar-1" />
                <span className="eq-bar-2" />
                <span className="eq-bar-3" />
              </>
            ) : (
              <Disc size={14} className="text-[#6C63FF]" />
            )}
          </div>
        </div>
      )}


      {/* Developer Credit Branding */}
      <div className="px-4 py-2 text-[10px] text-[#727272] border-t border-white/5 flex-shrink-0 select-none text-center">
        Developed by <span className="font-semibold text-white hover:text-[#6C63FF] transition-colors">Shivam Kothekar</span>
      </div>
    </aside>
  )
}
