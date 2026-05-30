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
  Play, Pause, X, Flame, Trophy, Sparkles, Calendar, TrendingUp, Loader2 
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
  const startRadioMode = usePlayerStore((state) => state.startRadioMode)

  // Streaks & Duels state
  const [streakDays, setStreakDays] = React.useState(1)
  const [todayCount, setTodayCount] = React.useState(0)
  const [topArtist, setTopArtist] = React.useState("")
  
  const [isDuelOpen, setIsDuelOpen] = React.useState(false)
  const [duelsCompleted, setDuelsCompleted] = React.useState(0)
  const [duelSongs, setDuelSongs] = React.useState<any[]>([])
  const [isFetchingSongs, setIsFetchingSongs] = React.useState(false)

  React.useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting("Good morning")
    else if (h < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
    setAppReady()
  }, [setAppReady])

  // Hydrate Streaks stats and completed duels from localStorage
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
  }, [isDuelOpen, isPlaying])

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

  // Pure Algorithmic Song Duel fetches
  const getDuelSongs = async () => {
    const streakData = JSON.parse(localStorage.getItem('streak_data') || '{}')
    const artists = streakData.artists || {}
    const artistKeys = Object.keys(artists)
    
    let query = ''
    
    if (artistKeys.length >= 2) {
      // Pick a random artist from played history
      const randomArtist = artistKeys[Math.floor(Math.random() * artistKeys.length)]
      query = randomArtist
    } else {
      // Fallback: fetch Hindi trending hits
      const trendingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/trending?type=song&lang=hindi`)
      const trendingData = await trendingRes.json()
      const trendingSongs = trendingData?.data || []
      
      const formatted = trendingSongs.map((s: any) => ({
        id: s.id,
        name: s.name || s.title || "",
        artist: s.subtitle || (s.artist_map?.primary_artists?.[0]?.name) || "Unknown Artist",
        image: extractImage(s.image),
        streamUrl: (s.download_url?.[4]?.link || s.download_url?.[s.download_url.length - 1]?.link || "").replace("http://", "https://"),
        duration: typeof s.duration === "string" ? parseInt(s.duration, 10) : (s.duration || 0)
      }))
      
      const shuffled = formatted.sort(() => Math.random() - 0.5)
      return [shuffled[0], shuffled[1]]
    }
    
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`)
    const data = await res.json()
    const searchData = data?.songs || data?.data || data || []
    
    const formatted = searchData.filter((s: any) => s.streamUrl || s.download_url).map((s: any) => ({
      id: s.id,
      name: s.name,
      artist: s.artist || query,
      image: s.image || "",
      streamUrl: s.streamUrl || "",
      duration: s.duration || 0
    }))

    if (formatted.length < 2) {
      const trendingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/trending?type=song&lang=hindi`)
      const trendingData = await trendingRes.json()
      const trendingSongs = trendingData?.data || []
      
      const tFormatted = trendingSongs.map((s: any) => ({
        id: s.id,
        name: s.name || s.title || "",
        artist: s.subtitle || (s.artist_map?.primary_artists?.[0]?.name) || "Unknown Artist",
        image: extractImage(s.image),
        streamUrl: (s.download_url?.[4]?.link || s.download_url?.[s.download_url.length - 1]?.link || "").replace("http://", "https://"),
        duration: typeof s.duration === "string" ? parseInt(s.duration, 10) : (s.duration || 0)
      }))
      const shuffled = tFormatted.sort(() => Math.random() - 0.5)
      return [shuffled[0], shuffled[1]]
    }
    
    const shuffled = formatted.sort(() => Math.random() - 0.5)
    return [shuffled[0], shuffled[1]]
  }

  const startDuel = async () => {
    setIsDuelOpen(true)
    setIsFetchingSongs(true)
    try {
      const songs = await getDuelSongs()
      setDuelSongs(songs)
    } catch (err) {
      toast.error("Could not fetch duel songs.")
    } finally {
      setIsFetchingSongs(false)
    }
  }

  const handleVote = (winner: any) => {
    const winnerToPlay: Song = {
      id: winner.id,
      name: winner.name,
      artist: winner.artist,
      image: winner.image,
      streamUrl: winner.streamUrl,
      duration: winner.duration,
    }
    play(winnerToPlay)
    
    const prefs = JSON.parse(localStorage.getItem('duel_prefs') || '{}')
    prefs[winner.id] = (prefs[winner.id] || 0) + 1
    localStorage.setItem('duel_prefs', JSON.stringify(prefs))
    
    const nextCompleted = duelsCompleted + 1
    setDuelsCompleted(nextCompleted)
    localStorage.setItem('completed_duels', String(nextCompleted))
    
    toast.success(`Voted for "${winner.name}"! Playing now...`)
    
    loadNextDuel()
  }

  const loadNextDuel = async () => {
    setIsFetchingSongs(true)
    try {
      const songs = await getDuelSongs()
      setDuelSongs(songs)
    } catch (err) {
      console.error(err)
    } finally {
      setIsFetchingSongs(false)
    }
  }

  const playYourMix = async () => {
    const resolveToast = toast.loading("Assembling your custom duel mix...")
    try {
      const prefs = JSON.parse(localStorage.getItem('duel_prefs') || '{}')
      const streakData = JSON.parse(localStorage.getItem('streak_data') || '{}')
      
      const artists = Object.keys(streakData.artists || {})
      let queryArtist = ""
      if (artists.length > 0) {
        queryArtist = artists[Math.floor(Math.random() * artists.length)]
      } else {
        queryArtist = "Arijit Singh"
      }
      
      const res = await fetch(`/api/search?query=${encodeURIComponent(queryArtist)}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      
      const searchSongs = json?.songs || json?.data || []
      if (searchSongs.length === 0) throw new Error()
      
      const mixSongs = searchSongs.slice(0, 10).map((s: any) => ({
        id: s.id,
        name: s.name,
        artist: s.artist || queryArtist,
        image: s.image || "",
        streamUrl: s.streamUrl || "",
        duration: s.duration || 0,
      }))
      
      toast.dismiss(resolveToast)
      setQueue(mixSongs, 0)
      toast.success("Vibe check complete! Playing Your Mix queue.")
      setIsDuelOpen(false)
    } catch {
      toast.dismiss(resolveToast)
      toast.error("Could not compile Your Mix. Try another duel!")
    }
  }

  if (!modules) {
    return <HomeSkeleton />
  }

  // Ordered sections with Radio Stations replaced
  const orderedSections = [
    { key: "trending", dataKey: "trending", fallbackTitle: "Trending Now", typeFallback: "song", seeAllHref: "/search?query=Trending" },
    { key: "charts", dataKey: "charts", fallbackTitle: "Top Charts", typeFallback: "playlist", seeAllHref: "/charts" },
    { key: "albums", dataKey: "albums", fallbackTitle: "New Releases", typeFallback: "album", seeAllHref: "/search?query=New Releases&type=albums" },
    { key: "playlists", dataKey: "playlists", fallbackTitle: "Editorial Picks", typeFallback: "playlist", seeAllHref: "/playlists" },
    { key: "promo0", dataKey: "promo0", fallbackTitle: "Fresh Hits", typeFallback: "playlist", seeAllHref: "/search?query=Fresh Hits" },
    { key: "promo3", dataKey: "promo3", fallbackTitle: "Trending Podcasts", typeFallback: "show", seeAllHref: "/search?query=Podcasts" },
    { key: "promo1", dataKey: "promo1", fallbackTitle: "Top Genres & Moods", typeFallback: "playlist", seeAllHref: "/search?query=Genres" },
    { key: "promo2", dataKey: "promo2", fallbackTitle: "Best Of 90s", typeFallback: "playlist", seeAllHref: "/search?query=90s Nostalgia" },
    { key: "artist_recos", dataKey: "artist_recos", fallbackTitle: "Recommended Artists", typeFallback: "artist", seeAllHref: "/search?query=Artists" },
    { key: "discover", dataKey: "discover", fallbackTitle: "Moods & Genres", typeFallback: "channel", seeAllHref: "/search" },
    { key: "city_mod", dataKey: "city_mod", fallbackTitle: "What's Hot", typeFallback: "artist", seeAllHref: "/search?query=What's Hot" }
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
                {/* Clean Circular Avatar - No Glow, No Gradient Ring */}
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

      {/* ── ENGAGEMENT HUB: SONG DUEL & LISTENING STREAK (Mobile & Desktop) ── */}
      <div className="px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
        {/* Song Duel Card */}
        <div 
          onClick={startDuel}
          className="bg-gradient-to-br from-[#6C63FF]/15 via-[#FF6584]/5 to-[#181824] border border-[#6C63FF]/20 p-5 md:p-6 rounded-2xl cursor-pointer hover:border-[#6C63FF]/40 hover:shadow-[0_0_20px_rgba(108,99,255,0.15)] transition-all duration-300 relative overflow-hidden group flex flex-col justify-between aspect-[2.8/1] md:aspect-[3.2/1] text-left"
        >
          <div className="absolute right-4 bottom-4 text-white/5 group-hover:text-[#6C63FF]/10 transition-colors duration-500 pointer-events-none">
            <Trophy size={80} className="rotate-[15deg] group-hover:rotate-[25deg] transition-transform duration-500" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Song Duel
            </h3>
            <p className="text-xs md:text-sm text-[#FF6584] font-bold uppercase tracking-wider mt-1">
              Which one?
            </p>
            <p className="text-[11px] text-gray-400 font-medium mt-2 max-w-[280px]">
              Pitting your top listening history artists. Vote to construct your custom mix!
            </p>
          </div>
          <button className="mt-3 px-5 py-2 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md w-fit group-hover:scale-105 active:scale-95 transition-transform duration-200">
            Start Duel
          </button>
        </div>

        {/* Listening Streak Card */}
        <div 
          onClick={() => router.push("/stats")}
          className="bg-gradient-to-br from-[#121222] via-[#0b0b14] to-[#080810] border border-white/10 p-5 md:p-6 rounded-2xl cursor-pointer hover:border-[#6C63FF]/25 hover:shadow-[0_0_20px_rgba(108,99,255,0.1)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between aspect-[2.8/1] md:aspect-[3.2/1] text-left group"
        >
          <div className="absolute right-4 bottom-4 text-white/5 group-hover:text-[#FF6584]/15 transition-colors duration-500 pointer-events-none">
            <Flame size={80} className="rotate-[-10deg] group-hover:rotate-0 transition-transform duration-500 fill-transparent group-hover:fill-transparent" />
          </div>
          <div className="w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6C63FF]">
                Your Streak
              </span>
              {topArtist && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#FF6584] truncate max-w-[120px]">
                  🎧 {topArtist}
                </span>
              )}
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mt-1.5 leading-none">
              {streakDays} Day Streak
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">
              Today: {todayCount} songs. Play 10 songs to secure your goal!
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full mt-3">
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-[#6C63FF] to-[#FF6584] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (todayCount / 10) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Sections Feed */}
      {orderedSections.map((sec) => {
        try {
          const sectionData = modules[sec.dataKey]
          if (!sectionData || !sectionData.data || !Array.isArray(sectionData.data) || sectionData.data.length === 0) {
            return null
          }

          const title = sectionData.title || sec.fallbackTitle
          const rawItems = sectionData.data
          const items = rawItems.map((item: any) => mapRawItem(item, sec.typeFallback))

          return (
            <div key={sec.key}>
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
                          {/* Beautiful glassmorphic background layer */}
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
          )
        } catch (error) {
          console.error(`Error rendering homepage section "${sec.key}":`, error)
          return null
        }
      })}

      {/* ── FULLSCREEN SONG DUEL MODAL OVERLAY ── */}
      {isDuelOpen && (
        <div className="z-50 fixed inset-0 bg-[#080810]/98 backdrop-blur-2xl flex flex-col p-4 md:p-8 overflow-y-auto select-none">
          {/* Header */}
          <div className="w-full max-w-4xl mx-auto flex items-center justify-between mb-8">
            <div className="text-left">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <Trophy size={28} className="text-[#FF6584] fill-[#FF6584]" /> Song Duel
              </h2>
              <p className="text-xs text-gray-400 font-semibold mt-1">
                {duelsCompleted} duels completed today
              </p>
            </div>
            <button
              onClick={() => setIsDuelOpen(false)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto gap-8">
            {isFetchingSongs ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 size={40} className="text-[#6C63FF] animate-spin" />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Conjuring Duels...</p>
              </div>
            ) : duelSongs.length < 2 ? (
              <div className="text-center py-16 space-y-4">
                <Sparkles size={48} className="text-[#6C63FF] mx-auto animate-pulse" />
                <p className="text-lg font-bold text-white">Generating battle tracks...</p>
                <button
                  onClick={loadNextDuel}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-xs font-bold rounded-full"
                >
                  Retry Fetch
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col md:flex-row gap-6 items-center justify-center">
                {duelSongs.slice(0, 2).map((song, idx) => {
                  const isCurrent = currentSong?.id === song.id
                  const isPlayingSong = isCurrent && isPlaying
                  
                  return (
                    <div
                      key={song.id || idx}
                      className="w-full md:w-[320px] bg-gradient-to-b from-[#181824] to-[#0d0d14] border border-white/5 p-5 rounded-3xl flex flex-col items-center justify-between text-center shadow-2xl relative overflow-hidden group aspect-[3/4]"
                    >
                      {/* Glowing subtle ring */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#6C63FF]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      {/* Song Cover Art */}
                      <div className="relative w-44 h-44 md:w-48 md:h-48 aspect-square rounded-2xl overflow-hidden shadow-xl bg-[#282828] mb-4 flex items-center justify-center">
                        {song.image ? (
                          <img
                            src={song.image}
                            alt={song.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <Sparkles size={40} className="text-white/20" />
                        )}
                        {/* Floating play preview overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isCurrent) {
                                isPlaying ? pause() : play()
                              } else {
                                play(song)
                              }
                            }}
                            className="w-12 h-12 rounded-full bg-[#6C63FF] flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
                          >
                            {isPlayingSong ? (
                              <Pause size={20} className="fill-white text-white" />
                            ) : (
                              <Play size={20} className="fill-white text-white ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="w-full min-w-0 px-2 space-y-1">
                        <h3 className="text-base font-bold text-white truncate" title={song.name}>
                          {song.name}
                        </h3>
                        <p className="text-xs text-gray-400 truncate" title={song.artist}>
                          {song.artist}
                        </p>
                      </div>

                      {/* Vote Action */}
                      <button
                        onClick={() => handleVote(song)}
                        className="w-full mt-6 py-3 bg-white/5 border border-white/10 hover:border-[#FF6584]/40 hover:bg-[#FF6584]/10 rounded-full text-xs font-black uppercase tracking-wider text-white hover:text-[#FF6584] transition-all active:scale-95 shadow-md"
                      >
                        Vote
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Your Mix Unlock area */}
            {duelsCompleted >= 5 && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <button
                  onClick={playYourMix}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#6C63FF] via-[#8C85FF] to-[#FF6584] text-sm font-black text-white uppercase tracking-wider rounded-full shadow-lg shadow-[#6C63FF]/30 hover:scale-105 active:scale-95 transition-transform"
                >
                  Play Your Mix 🎵
                </button>
                <span className="text-[9px] text-[#FF6584] uppercase tracking-widest font-extrabold animate-pulse">
                  Custom Duel mix unlocked!
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
