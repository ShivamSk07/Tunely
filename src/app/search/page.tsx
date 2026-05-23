"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { 
  Search, Disc, User, Loader2, Play
} from "lucide-react"
import SongPill from "@/components/SongPill"
import { Song, usePlayerStore } from "@/store/usePlayerStore"

const GENRE_CATEGORIES = [
  // Pop — mic on stage, pop concert lights
  { label: "Pop", color: "from-[#1DB954] to-[#158f3e]", query: "Pop Hits", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400&auto=format&fit=crop" },
  // Hip-Hop — microphone + rap/hip-hop stage
  { label: "Hip-Hop", color: "from-[#FF6B35] to-[#cc4d1a]", query: "Hip Hop", image: "https://images.unsplash.com/photo-1571609072496-9d3fe4a8f4e3?q=80&w=400&auto=format&fit=crop" },
  // Bollywood — colorful Indian cinema / dance
  { label: "Bollywood", color: "from-[#E91E63] to-[#ad1457]", query: "Bollywood Hits", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=400&auto=format&fit=crop" },
  // Romantic — couple silhouette at sunset
  { label: "Romantic", color: "from-[#9C27B0] to-[#6a1b9a]", query: "Romantic Songs", image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=400&auto=format&fit=crop" },
  // Lo-Fi — cozy desk with headphones, rain window
  { label: "Lo-Fi", color: "from-[#607D8B] to-[#37474f]", query: "Lofi Chill", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=400&auto=format&fit=crop" },
  // EDM — DJ booth with laser lights on stage
  { label: "EDM", color: "from-[#00BCD4] to-[#00838f]", query: "EDM Dance", image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=400&auto=format&fit=crop" },
  // Sufi — dervish spinning, spiritual
  { label: "Sufi", color: "from-[#FF9800] to-[#e65100]", query: "Sufi Music", image: "https://images.unsplash.com/photo-1604537529428-15bcbeecfe4d?q=80&w=400&auto=format&fit=crop" },
  // Workout — weights, gym, energy
  { label: "Workout", color: "from-[#F44336] to-[#b71c1c]", query: "Workout Energy", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop" },
  // Classical — violin / piano keys close up
  { label: "Classical", color: "from-[#795548] to-[#4e342e]", query: "Indian Classical", image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=400&auto=format&fit=crop" },
  // Party — crowd hands up, neon lights
  { label: "Party", color: "from-[#FF4081] to-[#c51162]", query: "Party Anthems", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop" },
  // Devotional — agarbatti/diya lamp, temple spiritual atmosphere
  { label: "Devotional", color: "from-[#FFC107] to-[#ff6f00]", query: "Bhajan Devotional", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop" },
  // Indie — guitarist on rooftop, artsy
  { label: "Indie", color: "from-[#3F51B5] to-[#1a237e]", query: "Indie Music", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop" },
]

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
    <div className="min-h-full pb-36 md:pb-12 bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
      {/* Sticky search bar — full width on mobile */}
      <div className="sticky top-0 z-20 px-4 md:px-6 pt-4 md:pt-8 pb-4 md:pb-6 bg-[#111118]/90 backdrop-blur-xl border-b border-white/5">
        <div className="relative w-full max-w-2xl mx-auto">
          <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#727272] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="What do you want to play?"
            className="w-full pl-14 pr-6 py-3.5 md:py-4 bg-[#282828] text-white placeholder-[#B3B3B3] rounded-full text-base font-semibold outline-none transition-all hover:bg-[#333] focus:bg-[#333] focus:ring-2 focus:ring-[#6C63FF] shadow-lg"
            autoFocus={!!queryParam}
          />
          {isLoading && (
            <Loader2 size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#6C63FF] animate-spin" />
          )}
        </div>
      </div>

      {/* Browse categories when no query */}
      {!debouncedQuery && (
        <div className="px-4 md:px-8 pb-8 space-y-4 md:space-y-6">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Browse all</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {GENRE_CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                onClick={() => { setSearchTerm(cat.query); setDebouncedQuery(cat.query) }}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] cursor-pointer shadow-lg hover:scale-[1.03] transition-all duration-300 border border-white/5 bg-[#181822]"
              >
                {/* Background image with hover zoom */}
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.6] group-hover:brightness-[0.7] group-hover:scale-115 transition-all duration-500"
                  loading="lazy"
                />
                
                {/* Glassmorphic/gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                
                {/* Visual Accent/Glow */}
                <div className="absolute -inset-px bg-gradient-to-br from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">
                  <p className="text-base md:text-lg font-black text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
            {/* Language filter pills */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              <span className="text-[11px] uppercase font-black tracking-widest text-[#727272] select-none pl-1">Language</span>
              <div className="flex gap-1 bg-[#181822] p-1 rounded-full border border-white/5 flex-shrink-0">
                {(["hindi", "punjabi", "english", "all"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all uppercase whitespace-nowrap tracking-wider ${
                      activeLang === lang
                        ? "bg-gradient-to-r from-[#6C63FF] to-[#8C85FF] text-white shadow-lg shadow-[#6C63FF]/30 scale-[1.02]"
                        : "text-[#B3B3B3] hover:text-white hover:bg-white/5"
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
