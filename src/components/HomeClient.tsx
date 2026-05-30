"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/useAppStore"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import SectionRow from "@/components/SectionRow"
import UniversalCard from "@/components/UniversalCard"
import HomeSkeleton from "@/components/HomeSkeleton"
import toast from "react-hot-toast"
import { 
  Play, Pause, Flame, Trophy, Sparkles, Loader2, ChevronRight, RefreshCw
} from "lucide-react"

interface HomeClientProps {
  modules: any | null
}

function extractImage(imageVal: any): string {
  if (!imageVal) return ""
  if (typeof imageVal === "string") {
    return imageVal.replace("http://", "https://")
  }
  if (Array.isArray(imageVal)) {
    const match = imageVal[2]?.link || imageVal[imageVal.length - 1]?.link || ""
    return match.replace("http://", "https://")
  }
  return ""
}

function formatRawSongToPlayerSong(raw: any): Song {
  let streamUrl = ""
  const urls = raw.download_url || raw.downloadUrl || []
  if (urls.length > 0) {
    streamUrl = (urls[4]?.link || urls[urls.length - 1]?.link || "").replace("http://", "https://")
  }
  const duration = typeof raw.duration === "string" ? parseInt(raw.duration, 10) : (raw.duration || 0)
  return {
    id: raw.id || "",
    name: raw.name || raw.title || "",
    artist: raw.subtitle || (raw.artist_map?.primary_artists?.[0]?.name) || "Unknown Artist",
    image: (raw.image || "").replace("http://", "https://"),
    streamUrl,
    duration: isNaN(duration) ? 0 : duration,
    url: raw.url || raw.perma_url || raw.link || "",
  }
}

const mapRawItem = (item: any, typeFallback: string) => {
  return {
    id: item.id || "",
    name: item.name || item.title || "",
    subtitle: item.count ? `${item.count} songs` : (item.subtitle || item.description || ""),
    type: item.type || typeFallback,
    image: extractImage(item.image),
    url: item.url || item.perma_url || item.link || ""
  }
}

export default function HomeClient({ modules }: HomeClientProps) {
  const router = useRouter()
  const setAppReady = useAppStore((state) => state.setAppReady)
  const [greeting, setGreeting] = React.useState("Good day")
  const [storyArtists, setStoryArtists] = React.useState<any[]>([])

  // Player Store integration
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const play = usePlayerStore((state) => state.play)
  const pause = usePlayerStore((state) => state.pause)

  // Streaks state
  const [streakDays, setStreakDays] = React.useState(1)
  const [todayCount, setTodayCount] = React.useState(0)
  const [topArtist, setTopArtist] = React.useState("")

  // Song Duel — inline card state
  const [isDuelActive, setIsDuelActive] = React.useState(false)
  const [duelsCompleted, setDuelsCompleted] = React.useState(0)
  const [duelSongs, setDuelSongs] = React.useState<any[]>([])
  const [isFetchingDuel, setIsFetchingDuel] = React.useState(false)
  const [duelVotedId, setDuelVotedId] = React.useState<string | null>(null)
  const [seenSongIds, setSeenSongIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting("Good morning")
    else if (h < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
    setAppReady()
  }, [setAppReady])

  // Hydrate streak stats from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const data = JSON.parse(localStorage.getItem('streak_data') || '{}')
      setStreakDays(data.streakDays || 1)
      setTodayCount(data.todayCount || 0)
      
      const artists = data.artists || {}
      let topArt = ""
      let maxCount = 0
      Object.entries(artists).forEach(([artName, count]: any) => {
        if (count > maxCount) {
          maxCount = count
          topArt = artName
        }
      })
      setTopArtist(topArt)
      
      const completed = parseInt(localStorage.getItem('completed_duels') || '0', 10)
      setDuelsCompleted(completed)
    }
  }, [currentSong?.id, isPlaying])

  // Frequency Algorithm to compute stories row artists based on listening history
  React.useEffect(() => {
    const computeStories = async () => {
      const recentArtists: Record<string, { count: number; image: string; url: string; name: string }> = {}
      
      try {
        const res = await fetch("/api/library/recent")
        if (res.ok) {
          const recentSongs = await res.json()
          if (Array.isArray(recentSongs) && recentSongs.length > 0) {
            recentSongs.forEach((song: any) => {
              const artistName = song.artist || "Unknown Artist"
              if (!recentArtists[artistName]) {
                recentArtists[artistName] = {
                  count: 0,
                  image: song.image || "",
                  url: `https://www.jiosaavn.com/artist/${encodeURIComponent(artistName)}-songs/`,
                  name: artistName
                }
              }
              recentArtists[artistName].count += 1
            })
          }
        }
      } catch (err) {
        console.warn("Could not calculate story algorithm from recent songs:", err)
      }

      const sortedRecents = Object.values(recentArtists).sort((a, b) => b.count - a.count)
      const recoArtists = modules?.artist_recos?.data || []
      const mergedList = [...sortedRecents]

      recoArtists.forEach((art: any) => {
        const mapped = mapRawItem(art, "artist")
        if (!mergedList.some((item) => item.name.toLowerCase() === mapped.name.toLowerCase())) {
          mergedList.push({
            count: 0,
            image: mapped.image,
            url: mapped.url,
            name: mapped.name
          })
        }
      })

      const defaultArtists = [
        { count: 0, name: "Arijit Singh", url: "https://www.jiosaavn.com/artist/arijit-singh-songs/LlRWpHzy3Hk_", image: "https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_150x150.jpg" },
        { count: 0, name: "Shreya Ghoshal", url: "https://www.jiosaavn.com/artist/shreya-ghoshal-songs/W0j-f-38M78_", image: "https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20230612135424_150x150.jpg" },
        { count: 0, name: "Pritam", url: "https://www.jiosaavn.com/artist/pritam-songs/OaFg9HPZgq8_", image: "https://c.saavncdn.com/artists/Pritam_Chakraborty-20170711073326_150x150.jpg" },
        { count: 0, name: "AR Rahman", url: "https://www.jiosaavn.com/artist/a.-r.-rahman-songs/v098,w,237I_", image: "https://c.saavncdn.com/artists/A_R_Rahman_003_20230612134812_150x150.jpg" },
        { count: 0, name: "Diljit Dosanjh", url: "https://www.jiosaavn.com/artist/diljit-dosanjh-songs/2gf-04PZ5As_", image: "https://c.saavncdn.com/artists/Diljit_Dosanjh_004_20221004113110_150x150.jpg" },
        { count: 0, name: "Anirudh", url: "https://www.jiosaavn.com/artist/anirudh-ravichander-songs/8tByt6Zc220_", image: "https://c.saavncdn.com/artists/Anirudh_Ravichander_004_20230612135118_150x150.jpg" },
        { count: 0, name: "Neha Kakkar", url: "https://www.jiosaavn.com/artist/neha-kakkar-songs/c4-N59R-dsw_", image: "https://c.saavncdn.com/artists/Neha_Kakkar_006_20200821105342_150x150.jpg" }
      ]

      defaultArtists.forEach((art) => {
        if (!mergedList.some((item) => item.name.toLowerCase() === art.name.toLowerCase())) {
          mergedList.push(art)
        }
      })

      setStoryArtists(mergedList.slice(0, 10))
    }

    computeStories()
  }, [modules])

  // Helper to dynamically resolve the artist's full Saavn URL
  const handleArtistClick = async (artist: any) => {
    const { name, url } = artist
    
    const cleaned = url ? url.replace("internal-site.jiosaavn.com/s/", "www.jiosaavn.com/") : ""
    const hasArtistPrefix = cleaned.startsWith("https://www.jiosaavn.com/artist/")
    
    if (hasArtistPrefix) {
      router.push(`/artist?link=${encodeURIComponent(cleaned)}`)
      return
    }

    const resolveToast = toast.loading(`Resolving discography for "${name}"...`)
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(name)}`)
      if (!res.ok) throw new Error("Search query failed")
      const json = await res.json()
      
      const matchedArtist = json?.artists?.[0]
      const resolvedLink = matchedArtist?.link || matchedArtist?.url
      
      if (resolvedLink) {
        toast.dismiss(resolveToast)
        router.push(`/artist?link=${encodeURIComponent(resolvedLink)}`)
      } else {
        throw new Error("No artist matched")
      }
    } catch (err) {
      toast.dismiss(resolveToast)
      console.warn(`Could not resolve artist link for ${name}:`, err)
      router.push(`/search?query=${encodeURIComponent(name)}`)
    }
  }

  const handleSongPlay = async (songItem: any) => {
    const song = formatRawSongToPlayerSong(songItem)
    const isCurrent = currentSong?.id === song.id
    
    if (isCurrent) {
      if (isPlaying) pause()
      else play()
    } else {
      if (!song.streamUrl && song.url) {
        const resolveToast = toast.loading("Resolving song audio stream...")
        try {
          const res = await fetch(`/api/song?link=${encodeURIComponent(song.url)}`)
          if (!res.ok) throw new Error()
          const detailedSong = await res.json()
          toast.dismiss(resolveToast)
          setQueue([detailedSong], 0)
        } catch {
          toast.dismiss(resolveToast)
          toast.error("Could not stream this song.")
        }
      } else {
        setQueue([song], 0)
      }
    }
  }

  const handleGenericClick = async (item: any) => {
    const { id, name, type, url } = item
    
    if (type === "song") {
      await handleSongPlay(item)
    } else if (type === "album") {
      router.push(`/album?link=${encodeURIComponent(url)}`)
    } else if (type === "playlist") {
      router.push(`/jiosaavn-playlist?id=${id}`)
    } else if (type === "artist") {
      await handleArtistClick(item)
    } else if (type === "channel") {
      router.push(`/search?query=${encodeURIComponent(name)}`)
    } else if (type === "show") {
      router.push(`/jiosaavn-playlist?id=${id}`)
    }
  }

  // ── ALGORITHM-BASED DUEL: uses listening history artists for personalized song fetching ──
  const getDuelSongs = async (): Promise<any[]> => {
    const streakData = JSON.parse(localStorage.getItem('streak_data') || '{}')
    const artistCounts: Record<string, number> = streakData.artists || {}

    // Sort by play count to get the most listened artists (algorithm-based)
    const sortedArtists = Object.entries(artistCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .map(([name]) => name)

    // Pick two different artists from history for a meaningful duel
    let queryA = ""
    let queryB = ""

    if (sortedArtists.length >= 2) {
      queryA = sortedArtists[0]
      queryB = sortedArtists[1]
    } else if (sortedArtists.length === 1) {
      queryA = sortedArtists[0]
      const recoArts = modules?.artist_recos?.data || []
      const filtered = recoArts.filter((a: any) => (a.name || a.title || "") !== queryA)
      queryB = filtered[0]?.name || filtered[0]?.title || "Arijit Singh"
    } else {
      const recoArts = modules?.artist_recos?.data || []
      if (recoArts.length >= 2) {
        queryA = recoArts[0]?.name || recoArts[0]?.title || "Arijit Singh"
        queryB = recoArts[1]?.name || recoArts[1]?.title || "Shreya Ghoshal"
      } else {
        queryA = "Arijit Singh"
        queryB = "Shreya Ghoshal"
      }
    }

    // Fetch one song from each artist, avoiding already seen songs if possible
    const fetchSongForArtist = async (artistQuery: string): Promise<any | null> => {
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(artistQuery)}&t=${Date.now()}`)
        if (!res.ok) return null
        const data = await res.json()
        const songs: any[] = data?.songs || data?.data || []
        const withStream = songs.filter((s: any) => s.streamUrl || s.download_url)
        if (withStream.length === 0) return null

        // Try to filter out already seen songs to keep it fresh
        const unseenSongs = withStream.filter((s: any) => !seenSongIds.has(s.id))
        const candidates = unseenSongs.length > 0 ? unseenSongs : withStream
        
        // Pick a random song from results
        const pick = candidates[Math.floor(Math.random() * Math.min(6, candidates.length))]
        return {
          id: pick.id,
          name: pick.name || pick.title || "",
          artist: pick.artist || pick.subtitle || artistQuery,
          image: pick.image ? pick.image.replace("http://", "https://") : extractImage(pick.image),
          streamUrl: (pick.streamUrl || pick.download_url?.[4]?.link || pick.download_url?.[pick.download_url?.length - 1]?.link || "").replace("http://", "https://"),
          duration: typeof pick.duration === "string" ? parseInt(pick.duration, 10) : (pick.duration || 0),
        }
      } catch {
        return null
      }
    }

    const [songA, songB] = await Promise.all([
      fetchSongForArtist(queryA),
      fetchSongForArtist(queryB),
    ])

    if (songA && songB) {
      // Add these to seen IDs so they are not repeated in subsequent duels
      setSeenSongIds(prev => {
        const next = new Set(prev)
        next.add(songA.id)
        next.add(songB.id)
        return next
      })
      return [songA, songB]
    }

    // Hard fallback: trending songs
    try {
      const trendingRes = await fetch(`/api/search?query=trending hindi hits&t=${Date.now()}`)
      const trendingData = await trendingRes.json()
      const trendingSongs = (trendingData?.songs || trendingData?.data || []).filter((s: any) => s.streamUrl || s.download_url)
      const unseenTrending = trendingSongs.filter((s: any) => !seenSongIds.has(s.id))
      const candidates = unseenTrending.length >= 2 ? unseenTrending : trendingSongs

      const shuffled = candidates.sort(() => Math.random() - 0.5)
      const resA = shuffled[0] ? { id: shuffled[0].id, name: shuffled[0].name, artist: shuffled[0].artist || queryA, image: (shuffled[0].image || "").replace("http://", "https://"), streamUrl: (shuffled[0].streamUrl || "").replace("http://", "https://"), duration: shuffled[0].duration || 0 } : null
      const resB = shuffled[1] ? { id: shuffled[1].id, name: shuffled[1].name, artist: shuffled[1].artist || queryB, image: (shuffled[1].image || "").replace("http://", "https://"), streamUrl: (shuffled[1].streamUrl || "").replace("http://", "https://"), duration: shuffled[1].duration || 0 } : null
      
      const out = [resA, resB].filter(Boolean) as any[]
      if (out.length >= 2) {
        setSeenSongIds(prev => {
          const next = new Set(prev)
          next.add(out[0].id)
          next.add(out[1].id)
          return next
        })
      }
      return out
    } catch {
      return []
    }
  }

  const startDuel = async () => {
    setIsDuelActive(true)
    setDuelVotedId(null)
    setDuelSongs([]) // clear state immediately to show loader
    setIsFetchingDuel(true)
    try {
      const songs = await getDuelSongs()
      setDuelSongs(songs)
    } catch {
      toast.error("Could not fetch duel songs.")
    } finally {
      setIsFetchingDuel(false)
    }
  }

  const handleVote = (winner: any) => {
    setDuelVotedId(winner.id)

    // Play the winner
    play(winner as Song)

    // Persist vote preference
    const prefs = JSON.parse(localStorage.getItem('duel_prefs') || '{}')
    prefs[winner.id] = (prefs[winner.id] || 0) + 1
    localStorage.setItem('duel_prefs', JSON.stringify(prefs))

    const nextCompleted = duelsCompleted + 1
    setDuelsCompleted(nextCompleted)
    localStorage.setItem('completed_duels', String(nextCompleted))

    toast.success(`Voted for "${winner.name}"! Playing now...`)
  }

  const refreshDuel = async () => {
    setDuelVotedId(null)
    setDuelSongs([]) // clear state immediately to show loader
    setIsFetchingDuel(true)
    try {
      const songs = await getDuelSongs()
      setDuelSongs(songs)
    } catch {
      console.error("Could not refresh duel.")
    } finally {
      setIsFetchingDuel(false)
    }
  }

  if (!modules) {
    return <HomeSkeleton />
  }

  // Ordered sections — Duel injected after position 2 (after trending + charts + albums), Streak at bottom
  const orderedSections = [
    { key: "trending", dataKey: "trending", fallbackTitle: "Trending Now", typeFallback: "song", seeAllHref: "/search?query=Trending" },
    { key: "charts", dataKey: "charts", fallbackTitle: "Top Charts", typeFallback: "playlist", seeAllHref: "/charts" },
    { key: "albums", dataKey: "albums", fallbackTitle: "New Releases", typeFallback: "album", seeAllHref: "/search?query=New Releases&type=albums" },
    // DUEL CARD injected here (after index 2)
    { key: "playlists", dataKey: "playlists", fallbackTitle: "Editorial Picks", typeFallback: "playlist", seeAllHref: "/playlists" },
    { key: "promo0", dataKey: "promo0", fallbackTitle: "Fresh Hits", typeFallback: "playlist", seeAllHref: "/search?query=Fresh Hits" },
    { key: "promo3", dataKey: "promo3", fallbackTitle: "Trending Podcasts", typeFallback: "show", seeAllHref: "/search?query=Podcasts" },
    { key: "promo1", dataKey: "promo1", fallbackTitle: "Top Genres & Moods", typeFallback: "playlist", seeAllHref: "/search?query=Genres" },
    { key: "promo2", dataKey: "promo2", fallbackTitle: "Best Of 90s", typeFallback: "playlist", seeAllHref: "/search?query=90s Nostalgia" },
    { key: "artist_recos", dataKey: "artist_recos", fallbackTitle: "Recommended Artists", typeFallback: "artist", seeAllHref: "/search?query=Artists" },
    { key: "discover", dataKey: "discover", fallbackTitle: "Moods & Genres", typeFallback: "channel", seeAllHref: "/search" },
    { key: "city_mod", dataKey: "city_mod", fallbackTitle: "What's Hot", typeFallback: "artist", seeAllHref: "/search?query=What's Hot" },
    // STREAK CARD injected at very bottom
  ]

  return (
    <div className="min-h-full pb-36 md:pb-16 bg-[#080810] space-y-8 md:space-y-10">
      {/* Premium Ambient Welcome Header */}
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-2">
        <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          {greeting}
        </h1>
      </div>

      {/* ── MINIMAL ARTIST STORIES (Visible on Mobile & Desktop) ── */}
      <div className="px-4 md:px-6 select-none">
        <div 
          className="flex gap-4 md:gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" 
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {storyArtists.map((artist, idx) => {
            const firstName = artist.name.split(" ")[0] || artist.name
            return (
              <div
                key={artist.name || idx}
                onClick={() => handleArtistClick(artist)}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer active:scale-95 hover:scale-105 transition-transform duration-150"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-white/10 overflow-hidden bg-[#282828] shadow-md flex items-center justify-center">
                  <img
                    src={artist.image || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&h=120&auto=format&fit=crop"}
                    alt={artist.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span className="text-[10px] md:text-xs text-gray-300 font-medium mt-2 w-16 md:w-20 truncate text-center leading-none">
                  {firstName}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dynamic Sections Feed — with Song Duel injected after 3rd section */}
      {orderedSections.map((sec, secIdx) => {
        // ── INJECT SONG DUEL CARD after index 2 (after trending, charts, albums) ──
        const duelCard = secIdx === 3 ? (
          <div key="__song_duel__" className="px-4 md:px-6 select-none">
            <div className="bg-gradient-to-br from-[#121225]/85 via-[#0d0d18]/95 to-[#08080f] border border-white/5 rounded-2xl overflow-hidden transition-all duration-500 hover:border-[#6C63FF]/30 hover:shadow-[0_0_32px_rgba(108,99,255,0.15)] shadow-2xl relative">
              
              {/* Card Header — always visible */}
              <div className="p-5 md:p-6 flex items-start justify-between relative overflow-hidden">
                {/* Ambient glowing blobs */}
                <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[#FF6584]/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-[#6C63FF]/5 rounded-full blur-[60px] pointer-events-none" />
                
                {/* Background Trophy */}
                <div className="absolute right-4 top-4 text-white/5 pointer-events-none z-0">
                  <Trophy size={70} className="rotate-[15deg]" />
                </div>

                <div className="flex-1 min-w-0 pr-4 z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-[#FF6584]/10 flex items-center justify-center border border-[#FF6584]/20">
                      <Trophy size={12} className="text-[#FF6584]" />
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-[#FF6584] bg-clip-text text-transparent">Song Duel</h3>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#6C63FF] to-[#FF6584] bg-clip-text text-transparent">
                    Which track reigns supreme?
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium mt-2 max-w-sm leading-relaxed">
                    Your dynamic personal mix algorithm chooses two contenders. Vote to determine the ultimate champion.
                  </p>
                </div>

                {/* Start / Refresh button */}
                <div className="z-10 mt-1">
                  {!isDuelActive ? (
                    <button
                      onClick={startDuel}
                      className="flex-shrink-0 px-6 py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-[#6C63FF]/25 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/10 hover:brightness-110"
                    >
                      Enter Arena
                    </button>
                  ) : (
                    <button
                      onClick={refreshDuel}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 hover:rotate-180"
                      title="Refresh Duel"
                    >
                      <RefreshCw size={14} className={isFetchingDuel ? "animate-spin text-[#6C63FF]" : ""} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Duel Content — expands inside the card */}
              {isDuelActive && (
                <div className="border-t border-white/5 px-4 md:px-6 pb-6 pt-5 bg-black/20 relative">
                  {isFetchingDuel ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <span className="absolute inset-0 rounded-full border-2 border-t-[#6C63FF] border-r-transparent border-l-transparent border-b-transparent animate-spin" />
                        <span className="absolute w-8 h-8 rounded-full border border-b-[#FF6584] border-r-transparent border-l-transparent border-t-transparent animate-spin [animation-direction:reverse]" />
                        <Trophy size={16} className="text-[#FF6584]/60" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest animate-pulse">Conjuring battle tracks...</p>
                    </div>
                  ) : duelSongs.length < 2 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                      <Sparkles size={22} className="text-[#6C63FF] animate-pulse" />
                      <button onClick={refreshDuel} className="text-xs text-[#6C63FF] font-bold underline">
                        Retry Fetch
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex flex-row gap-4 items-stretch justify-between">
                      
                      {/* Central VS Divider Badge */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF6584] flex items-center justify-center text-xs font-black text-white uppercase tracking-wider shadow-[0_0_20px_rgba(108,99,255,0.7)] border-[3px] border-[#0d0d18] pointer-events-none select-none">
                        VS
                      </div>

                      {duelSongs.slice(0, 2).map((song, idx) => {
                        const isCurrent = currentSong?.id === song.id
                        const isPlayingThis = isCurrent && isPlaying
                        const isVoted = duelVotedId === song.id
                        const loser = duelVotedId !== null && duelVotedId !== song.id

                        // Custom border and scale styles based on vote state
                        const stateClasses = isVoted
                          ? "border-[#FF6584] shadow-[0_0_24px_rgba(255,101,132,0.25)] scale-[1.02] z-10"
                          : loser
                          ? "border-white/5 opacity-30 scale-[0.97]"
                          : "border-white/5 hover:border-[#6C63FF]/40 hover:scale-[1.01] hover:bg-[#181829]/60"

                        return (
                          <div
                            key={song.id || idx}
                            className={`flex-1 min-w-0 bg-[#12121e]/90 rounded-2xl overflow-hidden border transition-all duration-500 flex flex-col justify-between ${stateClasses}`}
                          >
                            {/* Song Art Arena */}
                            <div className="relative aspect-square w-full overflow-hidden bg-[#181829] group">
                              {song.image ? (
                                <img
                                  src={song.image}
                                  alt={song.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Sparkles size={32} className="text-white/20" />
                                </div>
                              )}
                              
                              {/* Dynamic Visualizer overlay for active playing track */}
                              {isPlayingThis ? (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all duration-300">
                                  <div className="flex items-end justify-center gap-1.5 h-8 w-14 mb-2">
                                    <span className="w-1 bg-[#6C63FF] h-6 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1 bg-[#FF6584] h-8 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1 bg-[#6C63FF] h-5 rounded-full animate-bounce [animation-delay:-0.45s]" />
                                    <span className="w-1 bg-[#FF6584] h-7 rounded-full animate-bounce" />
                                  </div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-[#FF6584] drop-shadow-[0_0_8px_rgba(255,101,132,0.6)]">Playing preview</span>
                                </div>
                              ) : (
                                /* Play preview hover overlay */
                                <button
                                  onClick={() => {
                                    if (isCurrent) {
                                      isPlaying ? pause() : play()
                                    } else {
                                      play(song as Song)
                                    }
                                  }}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300"
                                >
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                                    <Play size={18} className="fill-white text-white ml-0.5" />
                                  </div>
                                </button>
                              )}

                              {/* Voted badge overlay */}
                              {isVoted && (
                                <div className="absolute top-3 right-3 px-3 py-1 bg-[#FF6584] rounded-full text-[9px] font-black text-white uppercase tracking-widest shadow-[0_2px_10px_rgba(255,101,132,0.4)] border border-white/20">
                                  Winner ✓
                                </div>
                              )}
                            </div>

                            {/* Song Info & Vote Trigger */}
                            <div className="p-3 md:p-4 space-y-3 flex-1 flex flex-col justify-between">
                              <div className="min-w-0">
                                <p className="text-xs md:text-sm font-black text-white truncate leading-tight group-hover:text-[#FF6584] transition-colors" title={song.name}>
                                  {song.name}
                                </p>
                                <p className="text-[9px] md:text-xs text-gray-400 font-bold truncate mt-1" title={song.artist}>
                                  {song.artist}
                                </p>
                              </div>
                              
                              {duelVotedId === null ? (
                                <button
                                  onClick={() => handleVote(song)}
                                  className="w-full py-2 bg-white/5 border border-white/10 hover:border-[#FF6584] hover:bg-[#FF6584]/15 rounded-xl text-[10px] font-black uppercase tracking-wider text-white hover:text-white transition-all active:scale-95 duration-300"
                                >
                                  Vote
                                </button>
                              ) : isVoted ? (
                                <div className="w-full py-2 bg-[#FF6584]/10 border border-[#FF6584]/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#FF6584] text-center">
                                  Your Favorite
                                </div>
                              ) : (
                                <div className="w-full py-2 bg-transparent border border-transparent rounded-xl text-[10px] font-bold text-gray-600 text-center">
                                  Defeated
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* After vote: show next duel prompt */}
                  {duelVotedId !== null && !isFetchingDuel && (
                    <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">
                          Scoreboard:
                        </span>
                        <span className="text-[10px] text-[#6C63FF] font-black bg-[#6C63FF]/10 px-2 py-0.5 rounded-full">
                          {duelsCompleted} Completed duels
                        </span>
                      </div>
                      <button
                        onClick={refreshDuel}
                        className="flex items-center gap-1.5 text-[11px] font-black text-[#FF6584] hover:text-[#6C63FF] uppercase tracking-wider transition-colors duration-300 active:scale-95"
                      >
                        Next Battle <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null

        try {
          const sectionData = modules[sec.dataKey]
          if (!sectionData || !sectionData.data || !Array.isArray(sectionData.data) || sectionData.data.length === 0) {
            return (
              <React.Fragment key={sec.key}>
                {duelCard}
              </React.Fragment>
            )
          }

          const title = sectionData.title || sec.fallbackTitle
          const rawItems = sectionData.data
          const items = rawItems.map((item: any) => mapRawItem(item, sec.typeFallback))

          return (
            <React.Fragment key={sec.key}>
              {duelCard}
              <div>
                {/* ── DESKTOP RENDERING ── */}
                <div className="hidden md:block">
                  <SectionRow title={title} seeAllHref={sec.seeAllHref}>
                    {items.map((cardItem: any) => (
                      <UniversalCard key={cardItem.id || cardItem.url} {...cardItem} />
                    ))}
                  </SectionRow>
                </div>

                {/* ── PREMIUM MOBILE-ONLY CUSTOM NON-REPETITIVE RENDERING ── */}
                <div className="md:hidden">
                  {sec.key === "trending" ? (
                    /* Premium Spotify-style 2-column Grid for top picks */
                    <div className="px-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
                        {sec.seeAllHref && (
                          <button
                            onClick={() => router.push(sec.seeAllHref!)}
                            className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider px-2.5 py-1 bg-white/5 rounded-full border border-white/5"
                          >
                            See All
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {items.slice(0, 6).map((item: any, idx: number) => {
                          const isCurrent = currentSong?.id === item.id
                          const isCurrentPlaying = isCurrent && isPlaying
                          return (
                            <div
                              key={item.id || idx}
                              onClick={() => handleGenericClick(rawItems[idx])}
                              className={`flex items-center gap-2 p-1.5 bg-[#181818] active:bg-[#282828] rounded-xl overflow-hidden cursor-pointer border border-transparent transition-all ${
                                isCurrent ? "bg-[#6C63FF]/10 border-[#6C63FF]/20" : ""
                              }`}
                            >
                              <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#282828]">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                {isCurrentPlaying && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 bg-[#FF6584] rounded-full animate-ping" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 pr-1">
                                <p className={`text-xs font-semibold truncate ${isCurrent ? "text-[#FF6584]" : "text-white"}`}>
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-[#B3B3B3] truncate mt-0.5">
                                  {item.subtitle || "Trending Song"}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : sec.key === "charts" ? (
                    /* Rank Badged Horizontal Slider for Top Charts */
                    <div className="px-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
                        {sec.seeAllHref && (
                          <button
                            onClick={() => router.push(sec.seeAllHref!)}
                            className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider px-2.5 py-1 bg-white/5 rounded-full border border-white/5"
                          >
                            See All
                          </button>
                        )}
                      </div>
                      <div
                        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {items.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            onClick={() => handleGenericClick(rawItems[idx])}
                            className="flex-shrink-0 w-[140px] snap-start bg-[#181818] p-3 rounded-2xl relative overflow-hidden text-left"
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-[#6C63FF]/5 to-transparent pointer-events-none" />
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#282828] mb-3">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center font-black text-[#FF6584] text-xs shadow border border-white/5">
                                {idx + 1}
                              </div>
                            </div>
                            <p className="text-xs font-bold text-white truncate leading-tight">{item.name}</p>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">Top Chart</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : sec.key === "albums" ? (
                    /* Larger, Prominent Card Slider for New Releases */
                    <div className="px-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
                        {sec.seeAllHref && (
                          <button
                            onClick={() => router.push(sec.seeAllHref!)}
                            className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider px-2.5 py-1 bg-white/5 rounded-full border border-white/5"
                          >
                            See All
                          </button>
                        )}
                      </div>
                      <div
                        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {items.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            onClick={() => handleGenericClick(rawItems[idx])}
                            className="w-[160px] flex-shrink-0 snap-start bg-[#181818] p-3 rounded-xl space-y-2.5 text-left hover:shadow-2xl"
                          >
                            <div className="relative aspect-square rounded-lg overflow-hidden bg-[#282828] shadow-md">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{item.name}</p>
                              <p className="text-[10px] text-[#B3B3B3] truncate mt-0.5">{item.subtitle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : sec.key === "promo0" ? (
                    /* Apple Music-style Vertical Triple-Stacks slider for Fresh Hits */
                    <div className="px-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
                        {sec.seeAllHref && (
                          <button
                            onClick={() => router.push(sec.seeAllHref!)}
                            className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider px-2.5 py-1 bg-white/5 rounded-full border border-white/5"
                          >
                            See All
                          </button>
                        )}
                      </div>
                      <div
                        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {Array.from({ length: Math.ceil(items.length / 3) }).map((_, chunkIdx) => {
                          const startIdx = chunkIdx * 3
                          const chunk = items.slice(startIdx, startIdx + 3)
                          return (
                            <div key={chunkIdx} className="w-[280px] flex-shrink-0 flex flex-col gap-2 snap-start">
                              {chunk.map((item: any, itemIdx: number) => {
                                const globalIdx = startIdx + itemIdx
                                const isCurrent = currentSong?.id === item.id
                                return (
                                  <div
                                    key={item.id || itemIdx}
                                    onClick={() => handleGenericClick(rawItems[globalIdx])}
                                    className={`flex items-center gap-3 p-2 bg-[#181818]/60 active:bg-[#282828] rounded-xl border border-transparent ${
                                      isCurrent ? "bg-[#6C63FF]/15 border-[#6C63FF]/10" : ""
                                    }`}
                                  >
                                    <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#282828]">
                                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-xs font-semibold truncate ${isCurrent ? "text-[#FF6584]" : "text-white"}`}>
                                        {item.name}
                                      </p>
                                      <p className="text-[9px] text-[#B3B3B3] truncate mt-0.5">
                                        {item.subtitle}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : sec.key === "artist_recos" ? (
                    /* Elegant Bordered Circular Profile Slider for Recommended Artists */
                    <div className="px-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
                        {sec.seeAllHref && (
                          <button
                            onClick={() => router.push(sec.seeAllHref!)}
                            className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider px-2.5 py-1 bg-white/5 rounded-full border border-white/5"
                          >
                            See All
                          </button>
                        )}
                      </div>
                      <div
                        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {items.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            onClick={() => handleGenericClick(rawItems[idx])}
                            className="w-[120px] flex-shrink-0 snap-start text-center space-y-2 cursor-pointer group"
                          >
                            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border border-white/10 group-hover:scale-105 active:scale-95 transition-transform duration-350 shadow-md bg-[#282828]">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-xs font-semibold text-white truncate max-w-[100px] mx-auto leading-tight">{item.name}</p>
                            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider leading-none">Artist</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : sec.key === "discover" ? (
                    /* Glassmorphic Gradient Text Pills for Moods & Genres */
                    <div className="px-4 space-y-3">
                      <h3 className="text-lg font-black text-white tracking-tight text-left">{title}</h3>
                      <div
                        className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {items.map((item: any, idx: number) => {
                          const gradients = [
                            "from-[#6C63FF]/30 to-[#FF6584]/20 border-[#6C63FF]/20",
                            "from-[#00BCD4]/30 to-[#3F51B5]/20 border-[#00BCD4]/20",
                            "from-[#FF9800]/30 to-[#E91E63]/20 border-[#FF9800]/20",
                            "from-[#4CAF50]/30 to-[#00838f]/20 border-[#4CAF50]/20"
                          ]
                          const grad = gradients[idx % gradients.length]
                          return (
                            <div
                              key={item.id || idx}
                              onClick={() => handleGenericClick(rawItems[idx])}
                              className={`flex-shrink-0 px-5 py-3 snap-start bg-gradient-to-r ${grad} border rounded-full backdrop-blur-md shadow cursor-pointer hover:brightness-110 active:scale-95 transition-all text-center`}
                            >
                              <span className="text-xs font-bold text-white tracking-wide uppercase">{item.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Standard universal card slider fallback for promo, podcast, hotspot, etc. */
                    <div className="px-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
                        {sec.seeAllHref && (
                          <button
                            onClick={() => router.push(sec.seeAllHref!)}
                            className="text-[10px] font-bold text-[#6C63FF] uppercase tracking-wider px-2.5 py-1 bg-white/5 rounded-full border border-white/5"
                          >
                            See All
                          </button>
                        )}
                      </div>
                      <div
                        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        {items.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            onClick={() => handleGenericClick(rawItems[idx])}
                            className="w-[130px] flex-shrink-0 snap-start bg-[#181818] p-2.5 rounded-xl space-y-2 text-left"
                          >
                            <div className={`relative aspect-square w-full overflow-hidden bg-[#282828] shadow-md ${sec.key === "artist_recos" ? "rounded-full" : "rounded-lg"}`}>
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 pr-1">
                              <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                              <p className="text-[9px] text-[#B3B3B3] truncate mt-0.5">{item.subtitle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          )
        } catch (error) {
          console.error(`Error rendering homepage section "${sec.key}":`, error)
          return duelCard ? (
            <React.Fragment key={sec.key}>{duelCard}</React.Fragment>
          ) : null
        }
      })}

      {/* ── TUNELY STREAK — Bottom of the page ── */}
      <div className="px-4 md:px-6 select-none pb-2">
        <div
          onClick={() => router.push("/stats")}
          className="bg-gradient-to-br from-[#121222] via-[#0b0b14] to-[#080810] border border-white/10 p-5 md:p-6 rounded-2xl cursor-pointer hover:border-[#6C63FF]/30 hover:shadow-[0_0_24px_rgba(108,99,255,0.12)] transition-all duration-300 relative overflow-hidden group"
        >
          {/* Background icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/5 group-hover:text-[#FF6584]/10 transition-colors duration-500 pointer-events-none">
            <Flame size={90} className="rotate-[-10deg] group-hover:rotate-0 transition-transform duration-500" />
          </div>

          <div className="relative z-10 flex items-start justify-between gap-4">
            {/* Left: Streak info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Flame size={14} className="text-[#FF6584]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6C63FF]">
                  Tunely Streak
                </span>
                {topArtist && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#FF6584]/80 truncate max-w-[100px]">
                    · 🎧 {topArtist}
                  </span>
                )}
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white leading-none">
                {streakDays} Day Streak 🔥
              </h3>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Today: <span className="text-white font-bold">{todayCount}</span> songs · Play 10 songs to secure your streak goal!
              </p>

              {/* Progress Bar */}
              <div className="mt-3 w-full max-w-xs">
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-[#6C63FF] to-[#FF6584] h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (todayCount / 10) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-gray-600 font-semibold">0</span>
                  <span className="text-[9px] text-gray-600 font-semibold">Goal: 10</span>
                </div>
              </div>
            </div>

            {/* Right: Stats mini pill */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-center">
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Streak</p>
                <p className="text-lg font-black text-white leading-none">{streakDays}d</p>
              </div>
              <span className="text-[9px] text-[#6C63FF] font-bold uppercase tracking-wider flex items-center gap-0.5">
                View Stats <ChevronRight size={10} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
