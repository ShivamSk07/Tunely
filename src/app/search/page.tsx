"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { 
  Search, Disc, User, Loader2, Play, Music, Flame, Sparkles, Heart, Moon, Zap, Compass, Activity, Volume2, Sun, Mic
} from "lucide-react"
import SongPill from "@/components/SongPill"
import { Song, usePlayerStore } from "@/store/usePlayerStore"

const GENRE_CATEGORIES = [
  { label: "Pop", gradient: "from-[#EC008C] to-[#FC6767]", query: "Pop Hits", icon: "music" },
  { label: "Hip-Hop", gradient: "from-[#FF5F6D] to-[#FFC371]", query: "Hip Hop", icon: "flame" },
  { label: "Bollywood", gradient: "from-[#F12711] to-[#F5AF19]", query: "Bollywood Hits", icon: "sparkles" },
  { label: "Romantic", gradient: "from-[#E040FB] to-[#FF4081]", query: "Romantic Songs", icon: "heart" },
  { label: "Lo-Fi", gradient: "from-[#1F1C2C] to-[#928DAB]", query: "Lofi Chill", icon: "moon" },
  { label: "EDM", gradient: "from-[#00c6ff] to-[#0072ff]", query: "EDM Dance", icon: "zap" },
  { label: "Sufi", gradient: "from-[#ffe259] to-[#ffa751]", query: "Sufi Music", icon: "compass" },
  { label: "Workout", gradient: "from-[#f857a6] to-[#ff5858]", query: "Workout Energy", icon: "activity" },
  { label: "Classical", gradient: "from-[#3A1C71] to-[#D76D77]", query: "Indian Classical", icon: "disc" },
  { label: "Party", gradient: "from-[#11998e] to-[#38ef7d]", query: "Party Anthems", icon: "volume-2" },
  { label: "Devotional", gradient: "from-[#ff9966] to-[#ff5e62]", query: "Bhajan Devotional", icon: "sun" },
  { label: "Indie", gradient: "from-[#4568DC] to-[#B06AB8]", query: "Indie Music", icon: "mic" },
]

function getGenreIcon(iconName: string) {
  switch (iconName) {
    case "music": return <Music size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "flame": return <Flame size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "sparkles": return <Sparkles size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "heart": return <Heart size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "moon": return <Moon size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "zap": return <Zap size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "compass": return <Compass size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "activity": return <Activity size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "disc": return <Disc size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "volume-2": return <Volume2 size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "sun": return <Sun size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    case "mic": return <Mic size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
    default: return <Music size={60} className="absolute -right-2 -bottom-2 text-white/20 group-hover:text-white/40 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 rotate-[25deg] pointer-events-none" />
  }
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryParam = searchParams.get("query") || ""
  const queryClient = useQueryClient()

  const handlePrefetchAlbum = (link: string) => {
    queryClient.prefetchQuery({
      queryKey: ["album", link],
      queryFn: async () => {
        const res = await fetch(`/api/album?link=${encodeURIComponent(link)}`)
        if (!res.ok) throw new Error("Failed to fetch album")
        return res.json()
      },
      staleTime: 300000,
    })
  }

  const handlePrefetchArtist = (link: string) => {
    queryClient.prefetchQuery({
      queryKey: ["artist", link],
      queryFn: async () => {
        const res = await fetch(`/api/artist?link=${encodeURIComponent(link)}`)
        if (!res.ok) throw new Error("Failed to fetch artist")
        return res.json()
      },
      staleTime: 300000,
    })
  }

  const setQueue = usePlayerStore((state) => state.setQueue)
  const [searchTerm, setSearchTerm] = useState(queryParam)
  const [debouncedQuery, setDebouncedQuery] = useState(queryParam)
  const [activeTab, setActiveTab] = useState<"songs" | "albums" | "artists">("songs")
  const [activeLang, setActiveLang] = useState<"hindi" | "punjabi" | "english" | "all">("hindi")

  useEffect(() => {
    if (queryParam) { setSearchTerm(queryParam); setDebouncedQuery(queryParam) }
  }, [queryParam])

  useEffect(() => {
    if (searchTerm === debouncedQuery) return
    const handler = setTimeout(() => setDebouncedQuery(searchTerm.trim()), 350)
    return () => clearTimeout(handler)
  }, [searchTerm, debouncedQuery])

  interface SearchAlbumResult {
    id: string
    link: string
    name: string
    artist?: string
    image?: string
  }

  interface SearchArtistResult {
    id: string
    link: string
    name: string
    image?: string
  }

  interface SearchResults {
    songs?: Song[]
    albums?: SearchAlbumResult[]
    artists?: SearchArtistResult[]
  }

  const { data, isLoading, isError } = useQuery<SearchResults>({
    queryKey: ["search", debouncedQuery, activeLang],
    queryFn: async (): Promise<SearchResults> => {
      if (!debouncedQuery) return {}
      const res = await fetch(`/api/search?query=${encodeURIComponent(debouncedQuery)}&lang=${activeLang}`)
      if (!res.ok) throw new Error("Search failed")
      return res.json()
    },
    enabled: !!debouncedQuery,
  })

  const handlePlaySong = (song: Song) => {
    if (data?.songs) {
      const idx = data.songs.findIndex((s) => s.id === song.id)
      setQueue(data.songs, idx === -1 ? 0 : idx)
    } else {
      setQueue([song], 0)
    }
  }

  const hasResults = !!(data && ((data.songs?.length ?? 0) > 0 || (data.albums?.length ?? 0) > 0 || (data.artists?.length ?? 0) > 0))

  return (
    <div className="min-h-full pb-36 md:pb-12 bg-[#090a0f]">
      {/* Sticky search bar — full width on mobile */}
      <div className="sticky top-0 z-20 px-4 md:px-6 pt-4 md:pt-6 pb-4 md:pb-5 bg-[#090a0f]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="relative w-full max-w-2xl mx-auto">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="What do you want to play?"
            className="w-full pl-13 pr-6 py-3 md:py-3.5 bg-white/[0.04] border border-white/10 text-white placeholder-white/40 rounded-full text-sm md:text-base font-medium outline-none transition-all hover:bg-white/[0.06] focus:bg-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20 shadow-sm"
            autoFocus={!!queryParam}
          />
          {isLoading && (
            <Loader2 size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50 animate-spin" />
          )}
        </div>
      </div>

      {/* Browse categories when no query */}
      {!debouncedQuery && (
        <div className="px-4 md:px-8 pb-8 space-y-4 md:space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Browse all</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {GENRE_CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                onClick={() => { setSearchTerm(cat.query); setDebouncedQuery(cat.query) }}
                className={`group relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer shadow-md hover:scale-[1.02] transition-all duration-200 border border-white/10 bg-gradient-to-br ${cat.gradient}`}
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/5 transition-colors duration-200" />

                {/* Floating Lucide Icon */}
                {getGenreIcon(cat.icon)}

                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                  <p className="text-base md:text-lg font-bold text-white tracking-tight">
                    {cat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {debouncedQuery && (
        <div className="px-4 md:px-6 pb-8 space-y-4 md:space-y-5">
          {/* Filters: Language filter & Content tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            {/* Language filter pills */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 select-none pl-1">Language</span>
              <div className="flex gap-1 bg-white/[0.04] p-1 rounded-full border border-white/[0.06] flex-shrink-0">
                {(["hindi", "punjabi", "english", "all"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all uppercase whitespace-nowrap tracking-wider ${
                      activeLang === lang
                        ? "bg-white text-black shadow-sm"
                        : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {lang === "all" ? "All" : lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Pill tabs — scrollable horizontal on mobile */}
            {!isLoading && hasResults && (
              <div
                className="flex gap-1 overflow-x-auto pb-1 md:pb-0 flex-shrink-0"
                style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
              >
                <div className="flex gap-1 bg-[#181822] p-1 rounded-full border border-white/5 flex-shrink-0">
                  {(["songs", "albums", "artists"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 md:px-5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all capitalize whitespace-nowrap ${
                        activeTab === tab ? "bg-white text-black" : "text-[#B3B3B3] hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg shimmer h-16" />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="text-center py-20">
              <p className="text-xl font-bold text-white">Something went wrong</p>
              <p className="text-sm text-[#B3B3B3] mt-2">Please try again</p>
            </div>
          )}

          {/* No results */}
          {!isLoading && !isError && !hasResults && (
            <div className="text-center py-20 space-y-2">
              <p className="text-2xl font-black text-white">No results found for</p>
              <p className="text-2xl font-black text-[#B3B3B3]">&ldquo;{debouncedQuery}&rdquo;</p>
              <p className="text-sm text-[#727272] mt-4">Check your spelling or use different keywords.</p>
            </div>
          )}

          {/* Songs list */}
          {!isLoading && activeTab === "songs" && data?.songs && data.songs.length > 0 && (
            <div className="space-y-2">
              {data.songs.map((song: Song, i: number) => (
                <SongPill
                  key={song.id}
                  song={song}
                  index={i}
                  onSongSelected={handlePlaySong}
                />
              ))}
            </div>
          )}

          {/* Albums grid */}
          {!isLoading && activeTab === "albums" && data?.albums && data.albums.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {data.albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/album?link=${encodeURIComponent(album.link)}`}
                  onMouseEnter={() => handlePrefetchAlbum(album.link)}
                  className="playlist-card bg-[#181818] hover:bg-[#282828] p-4 space-y-3 cursor-pointer transition-colors rounded-xl block text-left font-normal"
                >
                  <div className="relative aspect-square rounded-md overflow-hidden bg-[#282828]">
                    {album.image
                      ? <img src={album.image} alt={album.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Disc size={40} className="text-[#727272]" /></div>
                    }
                    <div className="play-overlay"><Play size={20} className="fill-white text-white ml-1" /></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white truncate">{album.name}</p>
                    <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{album.artist || "Album"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Artists grid */}
          {!isLoading && activeTab === "artists" && data?.artists && data.artists.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {data.artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist?link=${encodeURIComponent(artist.link)}`}
                  onMouseEnter={() => handlePrefetchArtist(artist.link)}
                  className="playlist-card bg-[#181818] hover:bg-[#282828] p-4 space-y-3 cursor-pointer transition-colors rounded-xl text-center block font-normal"
                >
                  <div className="relative mx-auto w-full aspect-square rounded-full overflow-hidden bg-[#282828]">
                    {artist.image
                      ? <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><User size={40} className="text-[#727272]" /></div>
                    }
                    <div className="play-overlay" style={{ borderRadius: "50%", bottom: "0", right: "0", width: "44px", height: "44px" }}>
                      <Play size={18} className="fill-white text-white ml-0.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                    <p className="text-xs text-[#B3B3B3] mt-0.5">Artist</p>
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

// SearchPage must wrap SearchContent in Suspense because useSearchParams()
// requires a Suspense boundary in Next.js 14 — without it the page crashes on SSR.
export default function SearchPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-full pb-36 md:pb-12 bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
        {/* Show the search bar immediately even while Suspense resolves */}
        <div className="sticky top-0 z-20 px-4 md:px-6 pt-4 md:pt-8 pb-4 md:pb-6 bg-[#111118]/90 backdrop-blur-xl border-b border-white/5">
          <div className="relative w-full max-w-2xl mx-auto">
            <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#727272] pointer-events-none" />
            <input
              type="text"
              placeholder="What do you want to play?"
              className="w-full pl-14 pr-6 py-3.5 md:py-4 bg-[#282828] text-white placeholder-[#B3B3B3] rounded-full text-base font-semibold outline-none transition-all shadow-lg"
            />
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </React.Suspense>
  )
}
