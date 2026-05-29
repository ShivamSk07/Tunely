"use client"

import React from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Play, Pause, ArrowRight, Heart, BarChart2, ListMusic, User, Search, Compass } from "lucide-react"
import RowSection from "@/components/RowSection"
import RowAlbums from "@/components/RowAlbums"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import { useAppStore } from "@/store/useAppStore"
import { FALLBACK_TRENDING_SONGS } from "@/lib/musicApi"

// ── TYPES ──
interface AlbumItem {
  id: string
  name: string
  artist?: string
  image: string
  link: string
}

interface PlaylistItem {
  id: string
  name: string
  image: string
  link: string
  songCount?: number
}

interface ArtistItem {
  id: string
  name: string
  image: string
  link: string
}

interface ChartItem {
  id: string
  name: string
  image: string
  link: string
}

interface ModulesData {
  trending_songs: Song[]
  featured_playlists: PlaylistItem[]
  charts: ChartItem[]
  new_trending: Song[]
  top_playlists: PlaylistItem[]
  albums: AlbumItem[]
  artist_recos: ArtistItem[]
}

interface LikedSongItem {
  songId: string
}

interface Props {
  initialTrending: Song[]
  initialAlbums: AlbumItem[]
  initialModules?: ModulesData | null
}

// Quick-access mood mixes
const MOOD_MIXES = [
  { label: "Dil Toota Sad",     query: "dil toota sad hindi songs",      key: "Chill",      gradient: "from-[#4f46e5] to-[#1e1b4b]" },
  { label: "Party Hits",        query: "party hindi dance songs",        key: "Party",      gradient: "from-[#ec4899] to-[#9f1239]" },
  { label: "Baarish Romantic",  query: "baarish hindi romantic songs",    key: "Sufi",       gradient: "from-[#059669] to-[#064e3b]" },
  { label: "Gym Workout",       query: "gym workout hindi rap",          key: "Workout",    gradient: "from-[#ea580c] to-[#7c2d12]" },
  { label: "Late Night Lofi",   query: "late night hindi lofi",          key: "Bollywood",  gradient: "from-[#607D8B] to-[#37474f]" },
  { label: "Romantic Love",     query: "romantic hindi love songs",      key: "Romantic",   gradient: "from-[#be185d] to-[#500724]" },
  { label: "Bhakti Morning",    query: "bhakti bhajan morning",          key: "Devotional", gradient: "from-[#FFC107] to-[#ff6f00]" },
]

const SPOTLIGHT_ARTISTS = [
  {
    name: "Arijit Singh",
    link: "https://www.jiosaavn.com/artist/arijit-singh-songs/LlRWpHzy3Hk_",
    image: "https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg",
    description: "India's most streamed romantic icon. Discover heartfelt ballads, soft hits, and full album collections."
  },
  {
    name: "Shreya Ghoshal",
    link: "https://www.jiosaavn.com/artist/shreya-ghoshal-songs/W0j-f-38M78_",
    image: "https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20230612135424_500x500.jpg",
    description: "The queen of modern melody. Stream Shreya's breathtaking hits and timeless cinematic blockbusters."
  },
  {
    name: "Jubin Nautiyal",
    link: "https://www.jiosaavn.com/artist/jubin-nautiyal-songs/L1PkWZgG-24_",
    image: "https://c.saavncdn.com/artists/Jubin_Nautiyal_005_20230612140445_500x500.jpg",
    description: "Master of soulful romantic hits. Dive into Jubin's beautiful collection of soft tunes and acoustic gems."
  },
  {
    name: "Neha Kakkar",
    link: "https://www.jiosaavn.com/artist/neha-kakkar-songs/c4-N59R-dsw_",
    image: "https://c.saavncdn.com/artists/Neha_Kakkar_006_20200821105342_500x500.jpg",
    description: "Bollywood's energetic chartbuster queen. Discover high-power party anthems and emotional masterpieces by Neha."
  },
  {
    name: "Atif Aslam",
    link: "https://www.jiosaavn.com/artist/atif-aslam-songs/96K4W,8,mlo_",
    image: "https://c.saavncdn.com/artists/Atif_Aslam_004_20230612134259_500x500.jpg",
    description: "A soulful voice that knows no borders. Experience the magical romantic blockbusters of legendary Atif Aslam."
  },
  {
    name: "AP Dhillon",
    link: "https://www.jiosaavn.com/artist/ap-dhillon-songs/X5,C2u,dMAM_",
    image: "https://c.saavncdn.com/artists/AP_Dhillon_003_20230811122602_500x500.jpg",
    description: "The pioneer of global Punjabi wave. Listen to brown munde anthems, synth-pop fusion, and high-energy beats."
  },
  {
    name: "Diljit Dosanjh",
    link: "https://www.jiosaavn.com/artist/diljit-dosanjh-songs/2gf-04PZ5As_",
    image: "https://c.saavncdn.com/artists/Diljit_Dosanjh_004_20221004113110_500x500.jpg",
    description: "Punjabi superstar and global sensation. Feel the vibe of Diljit's energetic bhangra beats and chart-topping hits."
  }
]

// Fisher-Yates shuffle seeded by a number so it's stable within one session
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── LAZY ROW WRAPPER ──
// Defers rendering of children until 600px before they enter the viewport.
// When not mounted, React-Query hooks don't fire — zero wasted requests on load.
function LazyRow({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "150px" } // Stagger pre-loading to prevent concurrent API saturation on mount
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={isVisible ? "" : "min-h-[150px]"}>
      {isVisible ? (
        children
      ) : (
        fallback || (
          <div className="px-4 md:px-6 mb-8 space-y-4">
            <div className="h-6 w-48 bg-[#1a1a24] rounded animate-pulse" />
            <div className="flex gap-4 overflow-x-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[140px] sm:w-[160px] md:w-[180px] aspect-square rounded-xl bg-[#1a1a24] animate-pulse flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ── ROW PROPS ──
interface RowProps {
  sessionSeed: number
  onSongSelected: (list: Song[], song: Song) => void
}

// ── SPECIALIZED LAZY ROW COMPONENTS ──

function DiscoverSongsRow({
  trendingSongs,
  likedSongs,
  onSongSelected
}: {
  trendingSongs: Song[]
  likedSongs: LikedSongItem[]
  onSongSelected: (list: Song[], song: Song) => void
}) {
  const { data: songs = [], isLoading } = useQuery<Song[]>({
    queryKey: ["discoverSongs", likedSongs?.length, trendingSongs?.length],
    queryFn: async () => {
      let seedId = ""
      if (likedSongs && likedSongs.length > 0) {
        const randIndex = Math.floor(Math.random() * likedSongs.length)
        seedId = likedSongs[randIndex].songId
      } else if (trendingSongs && trendingSongs.length > 0) {
        const randIndex = Math.floor(Math.random() * Math.min(trendingSongs.length, 5))
        seedId = trendingSongs[randIndex].id
      }

      if (!seedId) {
        const res = await fetch("/api/search?query=Discover&type=songs")
        if (!res.ok) return []
        const json = await res.json()
        return json.songs || []
      }

      const res = await fetch(`/api/song/recommend?id=${seedId}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    },
    enabled: trendingSongs.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  if (!isLoading && songs.length === 0) return null

  return (
    <div className="mb-8">
      <RowSection
        title="Discover Something New"
        songs={songs}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(songs, song)}
        mobileCardSize="sm"
      />
    </div>
  )
}

function NewReleasesRow({ sessionSeed, onSongSelected }: RowProps) {
  const { data: raw = [], isLoading } = useQuery<Song[]>({
    queryKey: ["newReleases"],
    queryFn: async () => {
      const res = await fetch("/api/search?query=Hits&type=songs")
      if (!res.ok) throw new Error()
      const d = await res.json()
      return d.songs || []
    },
    staleTime: 1000 * 60 * 5,
  })
  const songs = React.useMemo(() => seededShuffle(raw, sessionSeed + 1), [raw, sessionSeed])

  return (
    <div className="mb-8">
      <RowSection
        title="Fresh New Hits"
        songs={songs}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(songs, song)}
        mobileCardSize="lg"
      />
    </div>
  )
}

function LatestHindiRow({ sessionSeed, onSongSelected }: RowProps) {
  const { data: raw = [], isLoading } = useQuery<Song[]>({
    queryKey: ["latestHindi"],
    queryFn: async () => {
      const res = await fetch("/api/search?query=Latest%20Hindi%20Songs&type=songs")
      if (!res.ok) throw new Error()
      const d = await res.json()
      return d.songs || []
    },
    staleTime: 1000 * 60 * 5,
  })
  const songs = React.useMemo(() => seededShuffle(raw, sessionSeed + 2), [raw, sessionSeed])

  return (
    <div className="mb-8">
      <RowSection
        title="Recently Launched Hindi Songs"
        songs={songs}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(songs, song)}
        mobileCardSize="lg"
      />
    </div>
  )
}

function HindiRomanticRow({ sessionSeed, onSongSelected }: RowProps) {
  const { data: raw = [], isLoading } = useQuery<Song[]>({
    queryKey: ["hindiRomantic"],
    queryFn: async () => {
      const res = await fetch("/api/search?query=Hindi%20Romantic&type=songs")
      if (!res.ok) throw new Error()
      const d = await res.json()
      return d.songs || []
    },
    staleTime: 1000 * 60 * 5,
  })
  const songs = React.useMemo(() => seededShuffle(raw, sessionSeed + 3), [raw, sessionSeed])

  return (
    <div className="mb-8">
      <RowSection
        title="Hindi Romantic Hits"
        songs={songs}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(songs, song)}
        mobileCardSize="sm"
      />
    </div>
  )
}

function PopularMixesRow() {
  interface PopularMixItem {
    id: string
    name: string
    description?: string
    image: string
    link: string
  }

  const { data: popularMixes = [], isLoading } = useQuery<PopularMixItem[]>({
    queryKey: ["popularMixes"],
    queryFn: async (): Promise<PopularMixItem[]> => {
      const res = await fetch("/api/mix")
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    },
    staleTime: 1000 * 60 * 60 * 24, // 24h — static data
  })

  const formattedMixes = React.useMemo(() => popularMixes.map((mix) => ({
    id: mix.id,
    name: mix.name,
    artist: mix.description || "Curated Playlist",
    image: mix.image,
    link: mix.link,
  })), [popularMixes])

  if (!isLoading && formattedMixes.length === 0) return null

  return (
    <div className="mb-8">
      <RowAlbums
        title="Popular Mixes"
        albums={formattedMixes}
        isLoading={isLoading}
        mobileCardSize="lg"
      />
    </div>
  )
}

function ArijitSinghRow({ sessionSeed, onSongSelected }: RowProps) {
  const { data: raw = [], isLoading } = useQuery<Song[]>({
    queryKey: ["arijitSingh"],
    queryFn: async () => {
      const res = await fetch("/api/search?query=Arijit%20Singh%20Hits&type=songs")
      if (!res.ok) throw new Error()
      const d = await res.json()
      return d.songs || []
    },
    staleTime: 1000 * 60 * 5,
  })
  const songs = React.useMemo(() => seededShuffle(raw, sessionSeed + 4), [raw, sessionSeed])

  return (
    <div className="mb-8">
      <RowSection
        title="Arijit Singh Collections"
        songs={songs}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(songs, song)}
        mobileCardSize="md"
      />
    </div>
  )
}

function LofiHindiRow({ sessionSeed, onSongSelected }: RowProps) {
  const { data: raw = [], isLoading } = useQuery<Song[]>({
    queryKey: ["lofiHindi"],
    queryFn: async () => {
      const res = await fetch("/api/search?query=Lofi%20Hindi&type=songs")
      if (!res.ok) throw new Error()
      const d = await res.json()
      return d.songs || []
    },
    staleTime: 1000 * 60 * 5,
  })
  const songs = React.useMemo(() => seededShuffle(raw, sessionSeed + 5), [raw, sessionSeed])

  return (
    <div className="mb-8">
      <RowSection
        title="Bollywood Lofi and Chill"
        songs={songs}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(songs, song)}
        mobileCardSize="sm"
      />
    </div>
  )
}

function RetroHindiRow({ sessionSeed, onSongSelected }: RowProps) {
  const { data: raw = [], isLoading } = useQuery<Song[]>({
    queryKey: ["retroHindi"],
    queryFn: async () => {
      const res = await fetch("/api/search?query=Hindi%20Retro%20Classics&type=songs")
      if (!res.ok) throw new Error()
      const d = await res.json()
      return d.songs || []
    },
    staleTime: 1000 * 60 * 5,
  })
  const songs = React.useMemo(() => seededShuffle(raw, sessionSeed + 6), [raw, sessionSeed])

  return (
    <div className="mb-8">
      <RowSection
        title="Bollywood Retro Classics"
        songs={songs}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(songs, song)}
        mobileCardSize="lg"
      />
    </div>
  )
}

function RecentlyPlayedRow({ session, onSongSelected }: { session: any; onSongSelected: (list: Song[], song: Song) => void }) {
  interface RecentPlayItem {
    songId: string
    songName: string
    artist: string
    image: string
    streamUrl: string
    duration?: number
  }

  const { data: recentlyPlayed = [], isLoading } = useQuery<RecentPlayItem[]>({
    queryKey: ["recentlyPlayed"],
    queryFn: async (): Promise<RecentPlayItem[]> => {
      const res = await fetch("/api/library/recent")
      if (!res.ok) return []
      return res.json()
    },
    refetchOnMount: "always",
    enabled: !!session,
  })

  const formattedRecentlyPlayed: Song[] = React.useMemo(() => recentlyPlayed.map((rp) => ({
    id: rp.songId,
    name: rp.songName,
    artist: rp.artist,
    image: rp.image,
    streamUrl: rp.streamUrl,
    duration: rp.duration || 180,
  })), [recentlyPlayed])

  if (!session || formattedRecentlyPlayed.length === 0) return null

  return (
    <div className="mb-8">
      <RowSection
        title="Recently Played"
        songs={formattedRecentlyPlayed}
        isLoading={isLoading}
        onSongSelected={(song) => onSongSelected(formattedRecentlyPlayed, song)}
      />
    </div>
  )
}

// ── MAIN CLIENT HOMEPAGE ──

export default function HomeClient({ initialTrending, initialAlbums, initialModules }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const play = usePlayerStore((state) => state.play)
  const pause = usePlayerStore((state) => state.pause)
  const queryClient = useQueryClient()

  const handlePrefetchSearch = (query: string) => {
    queryClient.prefetchQuery({
      queryKey: ["search", query],
      queryFn: async () => {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error("Search failed")
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

  const [greeting, setGreeting] = React.useState("Good day")
  const [sessionSeed, setSessionSeed] = React.useState(0)
  const [spotlightArtist, setSpotlightArtist] = React.useState(SPOTLIGHT_ARTISTS[0])
  const [spotlightImg, setSpotlightImg] = React.useState(spotlightArtist.image)

  React.useEffect(() => {
    setSpotlightImg(spotlightArtist.image)
  }, [spotlightArtist])

  const setAppReady = useAppStore((state) => state.setAppReady)

  React.useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting("Good morning")
    else if (h < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
    setSessionSeed(Math.floor(Math.random() * 999983))

    // Select random Hindi spotlight artist on mount
    const randomArtist = SPOTLIGHT_ARTISTS[Math.floor(Math.random() * SPOTLIGHT_ARTISTS.length)]
    setSpotlightArtist(randomArtist)

    // Server already fetched data — signal app is ready immediately
    setAppReady()
  }, [setAppReady])

  // ── MODULES — client-side data fetch ──
  const { data: modules = initialModules, isLoading: isModulesLoading } = useQuery<ModulesData | null>({
    queryKey: ["modules"],
    queryFn: async () => {
      const res = await fetch("/api/modules?lang=hindi")
      if (!res.ok) throw new Error("Failed to fetch modules")
      const json = await res.json()
      return json.data || null
    },
    initialData: initialModules || undefined,
    initialDataUpdatedAt: initialModules ? Date.now() : undefined,
    staleTime: 1000 * 60 * 5,
  })

  // ── TRENDING — seeded with server data so browser sees it instantly ──
  const { data: trendingSongsRaw = initialTrending, isLoading: isTrendingLoading } = useQuery<Song[]>({
    queryKey: ["trending"],
    queryFn: async () => {
      const res = await fetch("/api/trending")
      if (!res.ok) throw new Error()
      return res.json()
    },
    initialData: initialTrending,
    initialDataUpdatedAt: Date.now(),
    staleTime: 1000 * 60 * 5,
  })

  // ── TRENDING ALBUMS — seeded with server data ──
  const { data: trendingAlbums = initialAlbums, isLoading: isAlbumsLoading } = useQuery<AlbumItem[]>({
    queryKey: ["trendingAlbums"],
    queryFn: async (): Promise<AlbumItem[]> => {
      const res = await fetch("/api/trending/albums")
      if (!res.ok) throw new Error()
      return res.json()
    },
    initialData: initialAlbums,
    initialDataUpdatedAt: Date.now(),
    staleTime: 1000 * 60 * 5,
  })

  // ── GENRE IMAGES — static, 24h stale ──
  const { data: genreImages = {} } = useQuery<Record<string, string>>({
    queryKey: ["genreImages"],
    queryFn: async () => {
      const res = await fetch("/api/genre-images")
      if (!res.ok) return {}
      return res.json()
    },
    staleTime: 86400000,
  })

  // ── LIKED SONGS — for discover seeding ──
  const { data: likedSongs = [] } = useQuery<LikedSongItem[]>({
    queryKey: ["likedSongs"],
    queryFn: async (): Promise<LikedSongItem[]> => {
      const res = await fetch("/api/library/likes")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!session,
  })

  const handleSongPlay = (list: Song[], song: Song) => {
    const idx = list.findIndex((s) => s.id === song.id)
    setQueue(list, idx === -1 ? 0 : idx)
  }

  const trendingSongs = React.useMemo(() => {
    let list = seededShuffle(trendingSongsRaw, sessionSeed)
    if (list.length < 6) {
      const existingIds = new Set(list.map((s) => s.id))
      for (const fallback of FALLBACK_TRENDING_SONGS) {
        if (!existingIds.has(fallback.id)) {
          list.push(fallback)
        }
        if (list.length >= 6) break
      }
    }
    return list
  }, [trendingSongsRaw, sessionSeed])

  const quickPicks = trendingSongs.slice(0, 6)
  const featuredSong = trendingSongs[0]

  return (
    <div className="min-h-full pb-36 md:pb-12">
      {/* ── GREETING HEADER ── */}
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-2 md:pb-6">
        <h1 className="text-xl md:text-3xl font-black text-white">{greeting}</h1>
        <p className="md:hidden text-sm text-[#B3B3B3] mt-1">What do you want to listen to?</p>
      </div>

      {/* ── MOBILE HERO: featured pick (replaces quick-pick cards on small screens) ── */}
      <div className="md:hidden px-4 mb-6">
        {isTrendingLoading ? (
          <div className="aspect-[5/3] rounded-2xl shimmer" />
        ) : featuredSong ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (currentSong?.id === featuredSong.id) {
                if (isPlaying) pause()
                else play()
              } else {
                handleSongPlay(trendingSongs, featuredSong)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (currentSong?.id === featuredSong.id) {
                  if (isPlaying) pause()
                  else play()
                } else {
                  handleSongPlay(trendingSongs, featuredSong)
                }
              }
            }}
            className="relative aspect-[5/3] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
          >
            <Image
              src={featuredSong.image || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=480&auto=format&fit=crop"}
              alt={featuredSong.name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6C63FF]">Pick for you</span>
              <h2 className="text-lg font-black text-white mt-1 line-clamp-1">{featuredSong.name}</h2>
              <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{featuredSong.artist}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6C63FF] text-white text-xs font-bold shadow-lg">
                {currentSong?.id === featuredSong.id && isPlaying ? (
                  <><Pause size={14} className="fill-white" /> Pause</>
                ) : (
                  <><Play size={14} className="fill-white ml-0.5" /> Play now</>
                )}
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex gap-2 mt-3">
          <Link
            href="/search"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a24] text-white text-xs font-bold hover:bg-[#282828] transition-colors"
          >
            <Search size={14} className="text-[#6C63FF]" />
            Search
          </Link>
          <Link
            href="/playlists"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a1a24] text-white text-xs font-bold hover:bg-[#282828] transition-colors"
          >
            <Compass size={14} className="text-[#FF6584]" />
            Playlists
          </Link>
        </div>
      </div>

      {/* ── QUICK PICKS: desktop only (2-col grid) ── */}
      {(isTrendingLoading || quickPicks.length > 0) && (
        <div className="hidden md:block px-4 md:px-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {isTrendingLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#1a1a24] rounded-xl h-16 shimmer animate-pulse" />
                ))
              : quickPicks.map((song) => {
                  const isCurrent = currentSong?.id === song.id
                  return (
                    <div
                      key={song.id}
                      onClick={() => {
                        if (isCurrent) {
                          if (isPlaying) pause()
                          else play()
                        } else {
                          handleSongPlay(quickPicks, song)
                        }
                      }}
                      className={`flex items-center gap-3 rounded-xl cursor-pointer group transition-all overflow-hidden ${
                        isCurrent ? "bg-[#6C63FF22] border border-[#6C63FF44]" : "bg-[#1a1a24] hover:bg-[#282828]"
                      }`}
                    >
                      <Image
                        src={song.image || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=64&h=64&auto=format&fit=crop"}
                        alt={song.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover flex-shrink-0 rounded-l-xl"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0 py-2">
                        <p className={`text-sm font-bold truncate ${isCurrent ? "text-[#6C63FF]" : "text-white"}`}>
                          {song.name}
                        </p>
                        <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{song.artist}</p>
                      </div>
                      <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full mr-3 transition-all ${
                        isCurrent ? "bg-[#6C63FF] opacity-100" : "bg-[#6C63FF] opacity-0 group-hover:opacity-100"
                      } shadow-lg`}>
                        {isCurrent && isPlaying
                          ? <Pause size={15} className="fill-white text-white" />
                          : <Play size={15} className="fill-white text-white ml-0.5" />
                        }
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}


      {/* ── TRENDING SECTION ── */}
      <div className="mb-8">
        <RowSection
          title="Trending Now"
          songs={trendingSongs}
          isLoading={isTrendingLoading}
          onSongSelected={(song) => handleSongPlay(trendingSongs, song)}
          mobileCardSize="md"
        />
      </div>

      {/* ── MOOD MIXES ── */}
      <div className="mb-8">
        <div className="px-4 md:px-6 mb-3 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-black text-white">Mood & Vibes</h2>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {MOOD_MIXES.map((mix) => (
            <button
              key={mix.key}
              onClick={() => {
                handlePrefetchSearch(mix.query)
                router.push(`/search?q=${encodeURIComponent(mix.query)}`)
              }}
              className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${mix.gradient} whitespace-nowrap transition-all active:scale-95 hover:opacity-90 shadow-md`}
            >
              {mix.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DYNAMIC DISCOVER (Lazy) ── */}
      <LazyRow>
        <DiscoverSongsRow
          trendingSongs={trendingSongs}
          likedSongs={likedSongs}
          onSongSelected={handleSongPlay}
        />
      </LazyRow>

      {/* ── RECENTLY LAUNCHED HINDI (Lazy) ── */}
      <LazyRow>
        <LatestHindiRow sessionSeed={sessionSeed} onSongSelected={handleSongPlay} />
      </LazyRow>

      {/* ── HINDI ROMANTIC HITS (Lazy) ── */}
      <LazyRow>
        <HindiRomanticRow sessionSeed={sessionSeed} onSongSelected={handleSongPlay} />
      </LazyRow>

      {/* ── POPULAR MIXES (Lazy) ── */}
      <LazyRow>
        <PopularMixesRow />
      </LazyRow>

      {/* ── ARIJIT SINGH HITS (Lazy) ── */}
      <LazyRow>
        <ArijitSinghRow sessionSeed={sessionSeed} onSongSelected={handleSongPlay} />
      </LazyRow>

      {/* ── FEATURED PLAYLISTS (from /modules) ── */}
      {(isModulesLoading || (modules?.featured_playlists && modules.featured_playlists.length > 0)) && (
        <LazyRow>
          <div className="mb-8">
            <div className="px-4 md:px-6 mb-3 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <ListMusic size={18} className="text-[#6C63FF]" />
                Featured Playlists
              </h2>
              <Link href="/playlists" className="text-xs font-bold text-[#B3B3B3] hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <RowAlbums
              title=""
              albums={modules?.featured_playlists?.map(p => ({ id: p.id, name: p.name, artist: `${p.songCount || ''} songs`, image: p.image, link: `/jiosaavn-playlist?id=${p.id}` })) || []}
              isLoading={isModulesLoading}
              linkPrefix=""
              mobileCardSize="sm"
            />
          </div>
        </LazyRow>
      )}

      {/* ── TOP CHARTS PREVIEW (from /modules) ── */}
      {(isModulesLoading || (modules?.charts && modules.charts.length > 0)) && (
        <LazyRow>
          <div className="mb-8 px-4 md:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <BarChart2 size={18} className="text-[#FF6584]" />
                Top Charts
              </h2>
              <Link href="/charts" className="text-xs font-bold text-[#B3B3B3] hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            {isModulesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[52px] bg-[#1a1a24] animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {modules?.charts?.slice(0, 6).map((chart, i) => (
                  <Link
                    key={chart.id}
                    href="/charts"
                    className="flex items-center gap-2 bg-[#1a1a24] hover:bg-[#282828] rounded-xl p-2.5 transition-all group"
                  >
                    <span className="text-xs font-black text-[#727272] w-5 flex-shrink-0 text-center">{i + 1}</span>
                    <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                      {chart.image ? <Image src={chart.image} alt={chart.name} width={32} height={32} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#282828]" />}
                    </div>
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[#6C63FF] transition-colors">{chart.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </LazyRow>
      )}

      {/* ── NEW RELEASES (from /modules) ── */}
      {(isModulesLoading || (modules?.new_trending && modules.new_trending.length > 0)) && (
        <LazyRow>
          <div className="mb-8">
            <RowSection
              title="New Releases"
              songs={modules?.new_trending || []}
              isLoading={isModulesLoading}
              onSongSelected={(song) => handleSongPlay(modules?.new_trending || [], song)}
              mobileCardSize="sm"
            />
          </div>
        </LazyRow>
      )}

      {/* ── TRENDING ALBUMS (modules or fallback) ── */}
      {(() => {
        const albumsData = modules?.albums?.length ? modules.albums : trendingAlbums
        const isLoading = isModulesLoading ? true : (!modules?.albums?.length && isAlbumsLoading)
        return (albumsData.length > 0 || isLoading) ? (
          <div className="mb-8">
            <RowAlbums title="Popular Albums" albums={albumsData.map(a => ({ id: a.id, name: a.name, artist: a.artist || "Various Artists", image: a.image, link: a.link }))} isLoading={isLoading} mobileCardSize="md" />
          </div>
        ) : null
      })()}

      {/* ── POPULAR ARTISTS (from /modules) ── */}
      {(isModulesLoading || (modules?.artist_recos && modules.artist_recos.length > 0)) && (
        <LazyRow>
          <div className="mb-8">
            <div className="px-4 md:px-6 mb-3 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <User size={18} className="text-[#6C63FF]" />
                Popular Artists
              </h2>
            </div>
            {isModulesLoading ? (
              <div className="flex gap-4 overflow-x-hidden px-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[88px] text-center space-y-2">
                    <div className="w-[72px] h-[72px] rounded-full bg-[#1a1a24] animate-pulse mx-auto" />
                    <div className="h-3 bg-[#1a1a24] animate-pulse rounded w-14 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {modules?.artist_recos?.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artist?link=${encodeURIComponent(artist.link)}`}
                    className="flex-shrink-0 w-[88px] text-center group snap-start block font-normal"
                  >
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden mx-auto bg-[#1a1a24] border border-white/5 mb-2 group-hover:border-[#6C63FF66] transition-all group-hover:scale-105 duration-300 relative shadow-lg">
                      {artist.image ? (
                        <Image src={artist.image} alt={artist.name} width={72} height={72} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><User size={26} className="text-[#727272]" /></div>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-white truncate group-hover:text-[#6C63FF] transition-colors px-1">{artist.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </LazyRow>
      )}

      {/* ── BOLLYWOOD LOFI & CHILL (Lazy) ── */}
      <LazyRow>
        <LofiHindiRow sessionSeed={sessionSeed} onSongSelected={handleSongPlay} />
      </LazyRow>

      {/* ── NEW HITS (Lazy) ── */}
      <LazyRow>
        <NewReleasesRow sessionSeed={sessionSeed} onSongSelected={handleSongPlay} />
      </LazyRow>

      {/* ── RETRO BOLLYWOOD CLASSICS (Lazy) ── */}
      <LazyRow>
        <RetroHindiRow sessionSeed={sessionSeed} onSongSelected={handleSongPlay} />
      </LazyRow>

      {/* ── RECENTLY PLAYED (Lazy) ── */}
      <LazyRow>
        <RecentlyPlayedRow session={session} onSongSelected={handleSongPlay} />
      </LazyRow>

      {/* ── ARTIST SPOTLIGHT BANNER ── */}
      <div className="px-4 sm:px-6 mb-8">
        <Link
          href={`/artist?link=${encodeURIComponent(spotlightArtist.link)}`}
          onMouseEnter={() => handlePrefetchArtist(spotlightArtist.link)}
          className="relative overflow-hidden rounded-2xl cursor-pointer group block text-left font-normal"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >
          {/* Background art blur */}
          <div
            className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500 bg-cover bg-center blur-2xl scale-110"
            style={{ backgroundImage: `url(${spotlightImg})` }}
          />
          <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-8">
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/10 shadow-2xl">
              <Image
                src={spotlightImg}
                alt={spotlightArtist.name}
                width={112}
                height={112}
                priority={false}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => {
                  setSpotlightImg("https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&auto=format&fit=crop")
                }}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#FF6584]">Artist Spotlight</span>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-1 truncate w-full">{spotlightArtist.name}</h2>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed max-w-xl">
                {spotlightArtist.description}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform">
                <Play size={14} className="fill-black" />
                Explore Artist
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── LOGIN PROMO (guests) ── */}
      {!session?.user && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{ background: "linear-gradient(135deg, #6C63FF22 0%, #FF658422 100%)", border: "1px solid rgba(108,99,255,0.15)" }}>
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-xl font-black text-white flex items-center gap-2 justify-center sm:justify-start">
                <Heart size={20} className="text-[#FF6584]" />
                Save what you love
              </h3>
              <p className="text-sm text-[#B3B3B3] max-w-sm">
                Sign in to like songs, create playlists, and sync your listening history across devices.
              </p>
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent("trigger-auth")
                window.dispatchEvent(event)
              }}
              className="px-8 py-3 bg-white text-black text-sm font-black rounded-full hover:scale-105 transition-transform shadow-xl whitespace-nowrap"
            >
              Sign up free
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
