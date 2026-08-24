"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/useAppStore"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import SectionRow from "@/components/SectionRow"
import UniversalCard from "@/components/UniversalCard"
import HomeSkeleton from "@/components/HomeSkeleton"
import toast from "react-hot-toast"
import { Play, Disc, Compass, TrendingUp } from "lucide-react"

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
    image: extractImage(raw.image),
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

export default function HomeClient({ modules: initialModules }: HomeClientProps) {
  const router = useRouter()
  const setAppReady = useAppStore((state) => state.setAppReady)
  const [modules, setModules] = React.useState<any | null>(initialModules)
  const [greeting, setGreeting] = React.useState("Good day")
  const [storyArtists, setStoryArtists] = React.useState<any[]>([])

  // Player Store integration
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const play = usePlayerStore((state) => state.play)
  const pause = usePlayerStore((state) => state.pause)

  // Fetch client-side if server modules were missing/null
  React.useEffect(() => {
    if (!modules) {
      fetch("/api/modules?lang=hindi")
        .then((res) => res.json())
        .then((json) => {
          if (json?.data) {
            setModules(json.data)
          } else if (json && typeof json === "object") {
            setModules(json)
          }
        })
        .catch((err) => console.warn("Client-side fallback modules fetch failed:", err))
    }
  }, [modules])

  React.useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting("Good morning")
    else if (h < 17) setGreeting("Good afternoon")
    else setGreeting("Good evening")
    setAppReady()
  }, [setAppReady])

  // Dynamically compute story artists from live modules and recent history (100% dynamic API data)
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
      const recoArtists = modules?.artist_recos?.data || modules?.top_artists?.data || modules?.artists?.data || []
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

      // If still empty, fetch live artist suggestions from search API dynamically
      if (mergedList.length < 5) {
        try {
          const searchRes = await fetch("/api/search?query=trending artists")
          if (searchRes.ok) {
            const searchData = await searchRes.json()
            const fetchedArtists = searchData?.artists || []
            fetchedArtists.forEach((art: any) => {
              if (!mergedList.some((item) => item.name.toLowerCase() === art.name.toLowerCase())) {
                mergedList.push({
                  count: 0,
                  image: art.image || "",
                  url: art.link || art.url || "",
                  name: art.name || art.title || "Artist"
                })
              }
            })
          }
        } catch {
          // silently ignore
        }
      }

      setStoryArtists(mergedList.slice(0, 12))
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

    const resolveToast = toast.loading(`Loading discography for "${name}"...`)
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
        const resolveToast = toast.loading("Loading track...")
        try {
          const res = await fetch(`/api/song?link=${encodeURIComponent(song.url)}`)
          if (!res.ok) throw new Error()
          const detailedSong = await res.json()
          toast.dismiss(resolveToast)
          setQueue([detailedSong], 0)
        } catch {
          toast.dismiss(resolveToast)
          toast.error("Could not play this song.")
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

  if (!modules) {
    return <HomeSkeleton />
  }

  // Ordered sections from the live API wrapper
  const orderedSections = [
    { key: "trending", dataKey: "trending", fallbackTitle: "Trending Now", typeFallback: "song", seeAllHref: "/search?query=Trending" },
    { key: "charts", dataKey: "charts", fallbackTitle: "Top Charts", typeFallback: "playlist", seeAllHref: "/charts" },
    { key: "albums", dataKey: "albums", fallbackTitle: "New Releases", typeFallback: "album", seeAllHref: "/search?query=New Releases&type=albums" },
    { key: "playlists", dataKey: "playlists", fallbackTitle: "Featured Playlists", typeFallback: "playlist", seeAllHref: "/playlists" },
    { key: "promo0", dataKey: "promo0", fallbackTitle: "Fresh Hits", typeFallback: "playlist", seeAllHref: "/search?query=Fresh Hits" },
    { key: "promo3", dataKey: "promo3", fallbackTitle: "Popular Podcasts", typeFallback: "show", seeAllHref: "/search?query=Podcasts" },
    { key: "promo1", dataKey: "promo1", fallbackTitle: "Genres & Moods", typeFallback: "playlist", seeAllHref: "/search?query=Genres" },
    { key: "promo2", dataKey: "promo2", fallbackTitle: "Throwback Classics", typeFallback: "playlist", seeAllHref: "/search?query=Classics" },
    { key: "artist_recos", dataKey: "artist_recos", fallbackTitle: "Popular Artists", typeFallback: "artist", seeAllHref: "/search?query=Artists" },
    { key: "discover", dataKey: "discover", fallbackTitle: "Explore Moods", typeFallback: "channel", seeAllHref: "/search" },
    { key: "city_mod", dataKey: "city_mod", fallbackTitle: "Regional Hits", typeFallback: "artist", seeAllHref: "/search?query=Hits" },
  ]

  return (
    <div className="min-h-full pb-36 md:pb-16 bg-[#090a0f] space-y-7 md:space-y-9">
      {/* Modern Welcome Header */}
      <div className="px-4 md:px-6 pt-5 md:pt-7 pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {greeting}
            </h1>
            <p className="text-xs md:text-sm text-white/40 mt-0.5">
              Stream live music, albums, and curated playlists
            </p>
          </div>

          {/* Quick Filter / Discover Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <button
              onClick={() => router.push("/charts")}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <TrendingUp size={13} className="text-white/60" /> Charts
            </button>
            <button
              onClick={() => router.push("/search?query=New Releases&type=albums")}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Disc size={13} className="text-white/60" /> New Releases
            </button>
            <button
              onClick={() => router.push("/playlists")}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Compass size={13} className="text-white/60" /> Playlists
            </button>
          </div>
        </div>
      </div>

      {/* ── ARTIST STORIES CAROUSEL (Mobile & Desktop) ── */}
      {storyArtists.length > 0 && (
        <div className="px-4 md:px-6 select-none">
          <div 
            className="flex gap-3.5 md:gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" 
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {storyArtists.map((artist, idx) => {
              const firstName = artist.name.split(" ")[0] || artist.name
              return (
                <div
                  key={artist.name || idx}
                  onClick={() => handleArtistClick(artist)}
                  className="flex flex-col items-center flex-shrink-0 cursor-pointer active:scale-95 hover:scale-105 transition-transform duration-150 group"
                >
                  <div className="w-16 h-16 md:w-18 md:h-18 rounded-full border border-white/10 group-hover:border-white/30 overflow-hidden bg-[#161722] shadow-sm flex items-center justify-center transition-colors">
                    {artist.image ? (
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <Disc size={24} className="text-white/30" />
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs text-white/60 group-hover:text-white font-medium mt-1.5 w-16 md:w-18 truncate text-center leading-none transition-colors">
                    {firstName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dynamic Sections Feed from live API wrapper */}
      {orderedSections.map((sec) => {
        try {
          const sectionData = modules[sec.dataKey]
          if (!sectionData || !sectionData.data || !Array.isArray(sectionData.data) || sectionData.data.length === 0) {
            return null
          }

          const rawItems = sectionData.data
          const title = sectionData.title || sec.fallbackTitle
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

              {/* ── MOBILE-OPTIMIZED RENDERING ── */}
              <div className="md:hidden">
                {sec.key === "trending" ? (
                  /* Clean 2-column Grid for top picks */
                  <div className="px-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                      {sec.seeAllHref && (
                        <button
                          onClick={() => router.push(sec.seeAllHref!)}
                          className="text-[10px] font-semibold text-white/60 hover:text-white uppercase tracking-wider px-2.5 py-1 bg-white/[0.04] rounded-full border border-white/[0.06]"
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
                            className={`flex items-center gap-2 p-1.5 bg-white/[0.03] active:bg-white/[0.08] rounded-xl overflow-hidden cursor-pointer border transition-all ${
                              isCurrent ? "bg-white/[0.08] border-white/20" : "border-white/[0.04]"
                            }`}
                          >
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#161722]">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              {isCurrentPlaying && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="eq-container">
                                    <span className="eq-bar-1" />
                                    <span className="eq-bar-2" />
                                    <span className="eq-bar-3" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pr-1">
                              <p className={`text-xs font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-white/90"}`}>
                                {item.name}
                              </p>
                              <p className="text-[10px] text-white/50 truncate mt-0.5">
                                {item.subtitle || "Track"}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : sec.key === "charts" ? (
                  /* Clean Horizontal Slider for Top Charts */
                  <div className="px-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                      {sec.seeAllHref && (
                        <button
                          onClick={() => router.push(sec.seeAllHref!)}
                          className="text-[10px] font-semibold text-white/60 hover:text-white uppercase tracking-wider px-2.5 py-1 bg-white/[0.04] rounded-full border border-white/[0.06]"
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
                          className="flex-shrink-0 w-[135px] snap-start bg-white/[0.025] active:bg-white/[0.06] border border-white/[0.05] p-2.5 rounded-xl relative overflow-hidden text-left"
                        >
                          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#161722] mb-2 border border-white/[0.06]">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center font-bold text-white text-[11px] border border-white/10 shadow-sm">
                              {idx + 1}
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-white truncate leading-tight">{item.name}</p>
                          <p className="text-[10px] text-white/50 truncate mt-0.5">Top Chart</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : sec.key === "albums" ? (
                  /* Prominent Card Slider for New Releases */
                  <div className="px-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                      {sec.seeAllHref && (
                        <button
                          onClick={() => router.push(sec.seeAllHref!)}
                          className="text-[10px] font-semibold text-white/60 hover:text-white uppercase tracking-wider px-2.5 py-1 bg-white/[0.04] rounded-full border border-white/[0.06]"
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
                          className="w-[145px] flex-shrink-0 snap-start bg-white/[0.025] active:bg-white/[0.06] border border-white/[0.05] p-2.5 rounded-xl space-y-2 text-left"
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-[#161722] border border-white/[0.06]">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                            <p className="text-[10px] text-white/50 truncate mt-0.5">{item.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : sec.key === "artist_recos" ? (
                  /* Clean Circular Artist Slider */
                  <div className="px-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                      {sec.seeAllHref && (
                        <button
                          onClick={() => router.push(sec.seeAllHref!)}
                          className="text-[10px] font-semibold text-white/60 hover:text-white uppercase tracking-wider px-2.5 py-1 bg-white/[0.04] rounded-full border border-white/[0.06]"
                        >
                          See All
                        </button>
                      )}
                    </div>
                    <div
                      className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      {items.map((item: any, idx: number) => (
                        <div
                          key={item.id || idx}
                          onClick={() => handleGenericClick(rawItems[idx])}
                          className="w-[110px] flex-shrink-0 snap-start text-center space-y-1.5 cursor-pointer group"
                        >
                          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto border border-white/10 group-hover:border-white/30 active:scale-95 transition-all shadow-sm bg-[#161722]">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-xs font-semibold text-white truncate max-w-[95px] mx-auto leading-tight">{item.name}</p>
                          <p className="text-[9px] text-white/40 uppercase tracking-wider leading-none">Artist</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : sec.key === "discover" ? (
                  /* Clean Pill Carousel for Discover */
                  <div className="px-4 space-y-3">
                    <h3 className="text-base font-bold text-white tracking-tight text-left">{title}</h3>
                    <div
                      className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      {items.map((item: any, idx: number) => (
                        <div
                          key={item.id || idx}
                          onClick={() => handleGenericClick(rawItems[idx])}
                          className="flex-shrink-0 px-4 py-2 snap-start bg-white/[0.04] active:bg-white/[0.08] border border-white/10 rounded-full cursor-pointer transition-all text-center"
                        >
                          <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard Universal Card Slider for other sections */
                  <div className="px-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                      {sec.seeAllHref && (
                        <button
                          onClick={() => router.push(sec.seeAllHref!)}
                          className="text-[10px] font-semibold text-white/60 hover:text-white uppercase tracking-wider px-2.5 py-1 bg-white/[0.04] rounded-full border border-white/[0.06]"
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
                          className="w-[130px] flex-shrink-0 snap-start bg-white/[0.025] active:bg-white/[0.06] border border-white/[0.05] p-2.5 rounded-xl space-y-2 text-left"
                        >
                          <div className={`relative aspect-square w-full overflow-hidden bg-[#161722] border border-white/[0.06] ${sec.key === "artist_recos" ? "rounded-full" : "rounded-lg"}`}>
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 pr-1">
                            <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                            <p className="text-[9px] text-white/50 truncate mt-0.5">{item.subtitle}</p>
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
    </div>
  )
}
