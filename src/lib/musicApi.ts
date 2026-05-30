export interface RawSong {
  id: string
  name: string
  subtitle?: string
  image: { quality: string; link: string }[]
  download_url: { quality: string; link: string }[]
  duration?: string | number
  play_count?: string | number
  has_lyrics?: boolean | string
  year?: string | number
  language?: string
  url?: string
}

export interface FormattedSong {
  id: string
  name: string
  artist: string
  image: string
  streamUrl: string
  duration: number
  playCount?: string | number
  year?: string | number
  url?: string
  downloadUrls?: { quality: string; link: string }[]
}

export function getImg(val: any): string {
  if (!val) return ""
  if (typeof val === 'string') return val.replace("http://", "https://")
  if (Array.isArray(val)) {
    if (val.length === 0) return ""
    // If it's an array of strings
    if (typeof val[0] === 'string') {
      const link = val[2] || val[val.length - 1] || ""
      return link.replace("http://", "https://")
    }
    // If it's an array of objects with link or url properties
    const item = val[2] || val[val.length - 1] || {}
    const link = item.link || item.url || ""
    return link.replace("http://", "https://")
  }
  return ""
}

export function formatSong(raw: RawSong): FormattedSong {
  const image = getImg(raw.image)

  // Use download_url[4] (320kbps) if available, fallback to last download url
  let streamUrl = ""
  if (raw.download_url && raw.download_url.length > 0) {
    streamUrl = raw.download_url[4]?.link || raw.download_url[raw.download_url.length - 1]?.link || ""
  }

  // Ensure duration is numeric
  const duration = typeof raw.duration === 'string' ? parseInt(raw.duration, 10) : (raw.duration || 0)

  return {
    id: raw.id,
    name: raw.name,
    artist: raw.subtitle || "Unknown Artist",
    image,
    streamUrl: streamUrl.replace("http://", "https://"),
    duration: isNaN(duration) ? 0 : duration,
    playCount: raw.play_count || 0,
    year: raw.year || "",
    url: raw.url || "",
    downloadUrls: raw.download_url || []
  }
}

interface CacheEntry {
  data: any
  expiry: number
}

const memoryCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 60 minutes cache (1 hour)

function getCachedData(key: string): any | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

function setCachedData(key: string, data: any): void {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL_MS
  })
}

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"
const API_TIMEOUT_MS = 10000 // 10-second timeout for all API calls

export const FALLBACK_TRENDING_SONGS: FormattedSong[] = [
  {
    id: "fallback_1",
    name: "Apna Bana Le",
    artist: "Arijit Singh & Sachin-Jigar",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
    playCount: "45,002,100",
    year: "2023"
  },
  {
    id: "fallback_2",
    name: "Kesariya",
    artist: "Arijit Singh & Pritam",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 425,
    playCount: "38,124,420",
    year: "2022"
  },
  {
    id: "fallback_3",
    name: "Chaleya",
    artist: "Anirudh Ravichander & Arijit Singh",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 302,
    playCount: "89,211,040",
    year: "2023"
  },
  {
    id: "fallback_4",
    name: "Kahani Suno 2.0",
    artist: "Kaifi Khalil",
    image: "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?q=80&w=400&auto=format&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 302,
    playCount: "19,873,320",
    year: "2023"
  },
  {
    id: "fallback_5",
    name: "Heeriye",
    artist: "Jasleen Royal & Arijit Singh",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&auto=format&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: 362,
    playCount: "124,310,980",
    year: "2023"
  },
  {
    id: "fallback_6",
    name: "Apna Bana Le (Lofi)",
    artist: "Arijit Singh & Sachin-Jigar",
    image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=400&auto=format&fit=crop",
    streamUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: 240,
    playCount: "25,321,990",
    year: "2024"
  }
]

export async function fetchTrending() {
  const cacheKey = "trending_v3"
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  try {
    // Reuse fetchModules which successfully calls the homepage /modules endpoint for real trending Hindi songs!
    const modules = await fetchModules("hindi")
    if (modules && modules.trending_songs && modules.trending_songs.length > 0) {
      const result = modules.trending_songs.filter((s: FormattedSong) => !s.id.startsWith("fallback_"))
      setCachedData(cacheKey, result)
      return result
    }
    return FALLBACK_TRENDING_SONGS
  } catch (error) {
    console.warn("fetchTrending failed. Serving premium fallbacks:", error)
    return FALLBACK_TRENDING_SONGS
  }
}

export async function searchSongs(query: string, type?: "all" | "songs", lang = "hindi") {
  const cacheKey = `search:${query}:${type || "all"}:${lang}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  // Graceful fetch with short timeout to prevent slow dependencies from blocking the search UI
  const fetchWithTimeout = async (url: string, timeoutMs: number) => {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        next: { revalidate: 600 }
      })
      if (!res.ok) return null
      return res.json()
    } catch (e) {
      console.warn(`Search query to ${url} failed or timed out:`, e)
      return null
    }
  }

  // Fetch specialized endpoints in parallel with tight, protective timeouts!
  // If we only need songs, skip fetching albums and artists to save precious bandwidth and API limits
  const fetchAlbums = type !== "songs"
  const fetchArtists = type !== "songs"

  const langQuery = lang && lang !== "all" ? `&lang=${lang}` : ""

  const [songsJson, albumsJson, artistsJson] = await Promise.all([
    fetchWithTimeout(`${BASE_URL}/search/songs?q=${encodeURIComponent(query)}${langQuery}`, 8000),
    fetchAlbums ? fetchWithTimeout(`${BASE_URL}/search/albums?q=${encodeURIComponent(query)}${langQuery}`, 8000) : Promise.resolve(null),
    fetchArtists ? fetchWithTimeout(`${BASE_URL}/search/artists?q=${encodeURIComponent(query)}${langQuery}`, 8000) : Promise.resolve(null)
  ])

  interface RawAlbumResult {
    id: string
    name?: string
    title?: string
    subtitle?: string
    description?: string
    image?: { quality: string; link: string }[]
    url?: string
    link?: string
  }

  interface RawArtistResult {
    id: string
    name?: string
    title?: string
    role?: string
    subtitle?: string
    image?: { quality: string; link: string }[]
    url?: string
    link?: string
  }

  const rawSongs = songsJson?.data?.results || []
  const rawAlbums: RawAlbumResult[] = albumsJson?.data?.results || []
  const rawArtists: RawArtistResult[] = artistsJson?.data?.results || []

  const result = {
    songs: rawSongs.map(formatSong),
    albums: rawAlbums.map((alb) => ({
      id: alb.id,
      name: alb.name || alb.title,
      artist: alb.subtitle || alb.description || "Album",
      image: (alb.image && alb.image[2]?.link) || (alb.image && alb.image[alb.image.length - 1]?.link) || "",
      link: alb.url || alb.link || "",
    })),
    artists: rawArtists.map((art) => ({
      id: art.id,
      name: art.name || art.title,
      artist: art.role || art.subtitle || "Artist",
      image: (art.image && art.image[2]?.link) || (art.image && art.image[art.image.length - 1]?.link) || "",
      link: art.url || art.link || "",
    })),
  }
  setCachedData(cacheKey, result)
  return result
}

function cleanJioSaavnLink(link: string): string {
  if (!link) return ""
  return link.replace("internal-site.jiosaavn.com/s/", "www.jiosaavn.com/")
}

export async function fetchAlbumDetails(link: string) {
  const cacheKey = `album:${link}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const cleaned = cleanJioSaavnLink(link)
  const res = await fetch(`${BASE_URL}/album?link=${encodeURIComponent(cleaned)}`, {
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
    next: { revalidate: 3600 }
  })
  if (!res.ok) throw new Error("Failed to fetch album details")
  const json = await res.json()
  const data = json.data || {}

  const rawSongs: RawSong[] = data.songs || []
  const songs = rawSongs.map(formatSong)

  const albumImage = (data.image && data.image[2]?.link) || (data.image && data.image[data.image.length - 1]?.link) || ""

  const result = {
    id: data.id,
    name: data.name || data.title,
    artist: data.subtitle || data.artist || "Various Artists",
    year: data.year || "",
    image: albumImage,
    songs,
    songCount: songs.length,
  }
  setCachedData(cacheKey, result)
  return result
}

export function hasArtistToken(link: string): boolean {
  if (!link) return false
  const cleaned = cleanJioSaavnLink(link)
  const parts = cleaned.split('/').filter(Boolean)
  const artistIndex = parts.indexOf('artist')
  if (artistIndex === -1) return false
  const tokenSegment = parts[artistIndex + 2]
  return !!(tokenSegment && tokenSegment.length >= 10)
}

export function cleanArtistNameForSearch(name: string): string {
  if (!name) return ""
  let parsed = name
  if (parsed.includes(" - ")) {
    parsed = parsed.split(" - ")[0]
  }
  if (parsed.includes(",")) {
    parsed = parsed.split(",")[0]
  }
  if (parsed.includes("&")) {
    parsed = parsed.split("&")[0]
  }
  if (parsed.toLowerCase().includes(" and ")) {
    parsed = parsed.split(/ and /i)[0]
  }
  return parsed.trim()
}

export async function fetchArtistDetails(link: string) {
  const cacheKey = `artist:${link}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const cleaned = cleanJioSaavnLink(link)
  const parts = cleaned.split('/').filter(Boolean)
  const artistIndex = parts.indexOf('artist')
  const hasToken = hasArtistToken(cleaned)

  let targetLink = cleaned

  if (!hasToken && artistIndex !== -1 && parts[artistIndex + 1]) {
    console.log(`[Artist Resolution] Link lacks token: ${link}. Attempting dynamic resolution...`)
    let namePart = parts[artistIndex + 1]
    if (namePart.endsWith('-songs')) {
      namePart = namePart.substring(0, namePart.length - 6)
    } else if (namePart.endsWith('-albums')) {
      namePart = namePart.substring(0, namePart.length - 7)
    }
    const artistName = decodeURIComponent(namePart).replace(/-/g, ' ')
    const cleanName = cleanArtistNameForSearch(artistName)
    
    try {
      const searchRes = await fetch(`${BASE_URL}/search/artists?q=${encodeURIComponent(cleanName)}`, {
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        next: { revalidate: 3600 }
      })
      if (searchRes.ok) {
        const searchJson = await searchRes.json()
        const firstArtist = searchJson?.data?.results?.[0]
        const resolvedLink = firstArtist?.url || firstArtist?.link
        if (resolvedLink) {
          console.log(`[Artist Resolution] Resolved "${artistName}" (cleaned: "${cleanName}") to ${resolvedLink}`)
          targetLink = cleanJioSaavnLink(resolvedLink)
        }
      }
    } catch (err) {
      console.warn(`[Artist Resolution] Failed resolving name for ${artistName} (cleaned: ${cleanName}):`, err)
    }
  }

  let data: any = null
  let fetchFailed = false

  try {
    const res = await fetch(`${BASE_URL}/artist?link=${encodeURIComponent(targetLink)}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      next: { revalidate: 3600 }
    })
    
    if (res.ok) {
      const json = await res.json()
      if (json.status !== "Failed") {
        data = json.data || {}
      } else {
        fetchFailed = true
      }
    } else {
      fetchFailed = true
    }
  } catch (error) {
    console.error("Direct artist fetch error:", error)
    fetchFailed = true
  }

  // If the fetch failed (due to bad link, 400, or unofficial API error), try a secondary name-based search fallback
  if (fetchFailed) {
    console.warn(`[Artist Resolution] Direct fetch failed for ${targetLink}. Trying secondary name-based search fallback...`)
    if (artistIndex !== -1 && parts[artistIndex + 1]) {
      let namePart = parts[artistIndex + 1]
      if (namePart.endsWith('-songs')) {
        namePart = namePart.substring(0, namePart.length - 6)
      } else if (namePart.endsWith('-albums')) {
        namePart = namePart.substring(0, namePart.length - 7)
      }
      const artistName = decodeURIComponent(namePart).replace(/-/g, ' ')
      const cleanName = cleanArtistNameForSearch(artistName)
      
      try {
        const searchRes = await fetch(`${BASE_URL}/search/artists?q=${encodeURIComponent(cleanName)}`, {
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
          next: { revalidate: 3600 }
        })
        if (searchRes.ok) {
          const searchJson = await searchRes.json()
          const firstArtist = searchJson?.data?.results?.[0]
          const resolvedLink = firstArtist?.url || firstArtist?.link
          if (resolvedLink && cleanJioSaavnLink(resolvedLink) !== targetLink) {
            const retryLink = cleanJioSaavnLink(resolvedLink)
            console.log(`[Artist Resolution] Secondary fallback: fetching resolved link: ${retryLink}`)
            const retryRes = await fetch(`${BASE_URL}/artist?link=${encodeURIComponent(retryLink)}`, {
              signal: AbortSignal.timeout(API_TIMEOUT_MS),
              next: { revalidate: 3600 }
            })
            if (retryRes.ok) {
              const json = await retryRes.json()
              if (json.status !== "Failed") {
                data = json.data || {}
              }
            }
          }
        }
      } catch (fallbackErr) {
        console.warn(`[Artist Resolution] Secondary search fallback failed:`, fallbackErr)
      }
    }
  }

  if (!data || !data.id) {
    throw new Error("Failed to fetch artist details after all attempts")
  }

  // Artist data contains top songs and albums (check both snake_case from proxy and fallback)
  const rawSongs: RawSong[] = data.top_songs || data.songs || []
  const topSongs = rawSongs.map(formatSong)

  interface ArtistAlbumResult {
    id: string
    name?: string
    title?: string
    year?: string | number
    image?: { quality: string; link: string }[]
    link?: string
    url?: string
  }

  const rawAlbums: ArtistAlbumResult[] = data.top_albums || data.albums || []
  const albums = rawAlbums.map((alb) => ({
    id: alb.id,
    name: alb.name || alb.title,
    year: alb.year || "",
    image: (alb.image && alb.image[2]?.link) || (alb.image && alb.image[alb.image.length - 1]?.link) || "",
    link: alb.link || alb.url || "",
  }))

  const artistImage = (data.image && data.image[2]?.link) || (data.image && data.image[data.image.length - 1]?.link) || ""

  const result = {
    id: data.id,
    name: data.name,
    image: artistImage,
    topSongs,
    albums,
  }
  setCachedData(cacheKey, result)
  return result
}

export async function fetchPlaylistDetails(link: string) {
  const cacheKey = `playlist:${link}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  try {
    const cleaned = cleanJioSaavnLink(link)
    const res = await fetch(`${BASE_URL}/playlist?link=${encodeURIComponent(cleaned)}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      next: { revalidate: 3600 }
    })
    if (!res.ok) throw new Error("Failed to fetch playlist details")
    const json = await res.json()
    const data = json.data || {}

    const rawSongs: RawSong[] = data.songs || []
    const songs = rawSongs.map(formatSong)

    const playlistImage = (data.image && data.image[2]?.link) || (data.image && data.image[data.image.length - 1]?.link) || ""

    const result = {
      id: data.id,
      name: data.name || data.title,
      image: playlistImage,
      songs,
    }
    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.warn(`fetchPlaylistDetails failed for link=${link}. Serving premium fallback:`, error)
    return {
      id: "fallback_playlist",
      name: "Featured Hits",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop",
      songs: FALLBACK_TRENDING_SONGS,
    }
  }
}

export const FALLBACK_TRENDING_ALBUMS = [
  {
    id: "fallback_alb_1",
    name: "Chilled Electronic",
    artist: "Synthwave / Chill",
    image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=400&auto=format&fit=crop",
    link: "https://www.jiosaavn.com/album/chilled-electronic/1"
  },
  {
    id: "fallback_alb_2",
    name: "Ultimate Pop Hits",
    artist: "Pop Sensations",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400&auto=format&fit=crop",
    link: "https://www.jiosaavn.com/album/ultimate-pop-hits/2"
  },
  {
    id: "fallback_alb_3",
    name: "Cozy Lo-Fi Cafe",
    artist: "Lofi Cafe Chill",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=400&auto=format&fit=crop",
    link: "https://www.jiosaavn.com/album/cozy-lofi-cafe/3"
  },
  {
    id: "fallback_alb_4",
    name: "Epic Rock Anthems",
    artist: "Rock Classics",
    image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=400&auto=format&fit=crop",
    link: "https://www.jiosaavn.com/album/epic-rock-anthems/4"
  }
]

export async function fetchTrendingAlbums() {
  const cacheKey = "trendingAlbums"
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  interface TrendingAlbumResult {
    id: string
    name?: string
    title?: string
    subtitle?: string
    description?: string
    image?: { quality: string; link: string }[]
    url?: string
    link?: string
    type: string
  }

  try {
    const res = await fetch(`${BASE_URL}/get/trending?type=album&lang=hindi`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      next: { revalidate: 3600 }
    })
    if (!res.ok) throw new Error("Status code not OK")
    const json = await res.json()

    const raw: TrendingAlbumResult[] = json.data || []
    const rawAlbums = raw.filter((item) => item.type === "album")
    const result = rawAlbums.map((alb) => ({
      id: alb.id,
      name: alb.name || alb.title,
      artist: alb.subtitle || alb.description || "Trending Album",
      image: alb.image?.[2]?.link || alb.image?.[alb.image.length - 1]?.link || "",
      link: alb.url || alb.link || "",
    }))
    
    if (result.length === 0) {
      throw new Error("Empty trending albums results returned")
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.warn("Failed to fetch trending albums from API. Serving premium fallbacks:", error)
    // Cache the fallbacks for 1 minute so we don't spam the failing endpoint
    memoryCache.set(cacheKey, {
      data: FALLBACK_TRENDING_ALBUMS,
      expiry: Date.now() + 60 * 1000
    })
    return FALLBACK_TRENDING_ALBUMS
  }
}

export async function fetchSongRecommendations(id: string): Promise<FormattedSong[]> {
  const cacheKey = `recommend:${id}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  let songs: FormattedSong[] = []

  // 1. Try direct recommend call with a tight timeout (2000ms)
  try {
    const res = await fetch(`${BASE_URL}/song/recommend?id=${id}`, {
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 3600 }
    })
    if (res.ok) {
      const json = await res.json()
      const recs = json.data || []
      if (Array.isArray(recs) && recs.length > 0) {
        songs = recs.map(formatSong)
      }
    }
  } catch (e) {
    console.warn(`Failed to fetch song recommendations for id=${id} directly:`, e)
  }

  // 2. Fallback: Query matching songs by the artist of this song
  if (songs.length === 0) {
    try {
      console.log(`Song Recommend Fallback: Fetching details for id=${id} to get artist`);
      const detailsRes = await fetch(`${BASE_URL}/songs?id=${id}`, {
        signal: AbortSignal.timeout(2000),
        next: { revalidate: 3600 }
      })
      if (detailsRes.ok) {
        const detailsJson = await detailsRes.json()
        const rawSong = Array.isArray(detailsJson) ? detailsJson[0] : (detailsJson.data?.[0] || detailsJson)
        
        if (rawSong) {
          const artist = rawSong.subtitle || rawSong.primaryArtists || ""
          if (artist) {
            console.log(`Song Recommend Fallback: Searching songs by artist ${artist}`);
            // Reuse searchSongs helper which handles search with cache and timeout!
            const searchRes = await searchSongs(artist, "songs")
            if (searchRes && searchRes.songs && searchRes.songs.length > 0) {
              songs = searchRes.songs.filter((s: any) => s.id !== id)
            }
          }
        }
      }
    } catch (e) {
      console.warn("Song recommend fallback failed:", e)
    }
  }

  // 3. Secondary Fallback: Trending songs (cached and fast!)
  if (songs.length === 0) {
    try {
      console.log("Song Recommend Secondary Fallback: Fetching trending songs");
      songs = await fetchTrending()
    } catch (e) {
      console.error("Song recommend secondary fallback failed:", e)
    }
  }

  // Deduplicate
  const seenIds = new Set<string>()
  const deduped = songs.filter((s) => {
    if (seenIds.has(s.id)) return false
    seenIds.add(s.id)
    return true
  })

  setCachedData(cacheKey, deduped)
  return deduped
}

// ── JIOSAAVN PLAYLIST BY ID ──
export async function fetchJioSaavnPlaylistById(id: string) {
  const cacheKey = `jiosaavn-playlist_v4:${id}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  try {
    // The correct Vercel endpoint is /playlist?id= (without 's')
    const res = await fetch(`${BASE_URL}/playlist?id=${id}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error("Failed to fetch JioSaavn playlist")
    const json = await res.json()
    const data = json.data || {}

    const rawSongs: RawSong[] = data.songs || []
    const songs = rawSongs.map(formatSong)
    const playlistImage = getImg(data.image)

    const result = {
      id: data.id,
      name: data.name || data.title,
      image: playlistImage,
      description: data.subtitle || data.description || "",
      songCount: songs.length,
      songs,
      isJioSaavn: true,
    }

    // If the playlist has empty songs, fetch from fallback
    if (songs.length === 0) {
      console.warn(`Playlist id=${id} has 0 songs. Serving premium fallback songs.`)
      result.songs = FALLBACK_TRENDING_SONGS
      result.songCount = FALLBACK_TRENDING_SONGS.length
    }

    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.warn(`fetchJioSaavnPlaylistById failed for id=${id}. Serving premium fallback:`, error)
    return {
      id: id,
      name: "Featured Hits",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop",
      description: "Enjoy a handpicked collection of popular tracks. (Server fallback)",
      songCount: FALLBACK_TRENDING_SONGS.length,
      songs: FALLBACK_TRENDING_SONGS,
      isJioSaavn: true,
    }
  }
}

// ── MODULES (Homepage All-in-One) ──
export async function fetchModules(lang = "hindi") {
  const cacheKey = `modules_v3:${lang}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  try {
    // The unofficial API's modules endpoint requires language parameter (e.g. language=hindi)
    const res = await fetch(`${BASE_URL}/modules?language=${encodeURIComponent(lang)}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`Modules API returned ${res.status}`)
    const json = await res.json()
    const data = json.data || {}

    const getArray = (val: any): any[] => {
      if (!val) return []
      if (Array.isArray(val)) return val
      if (Array.isArray(val.data)) return val.data
      return []
    }

    const getImg = (val: any): string => {
      if (!val) return ""
      if (typeof val === 'string') return val.replace("http://", "https://")
      if (Array.isArray(val)) {
        const link = val[2]?.link || val[val.length - 1]?.link || ""
        return link.replace("http://", "https://")
      }
      return ""
    }

    const trendingItems = getArray(data.trending || data.trending_songs)
    const trending_songs = trendingItems
      .filter((s: any) => s.type === 'song' || s.download_url || s.downloadUrl)
      .map(formatSong)

    const featured_playlists = getArray(data.playlists || data.featured_playlists).map((p: any) => ({
      id: p.id,
      name: p.name || p.title || "",
      image: getImg(p.image),
      link: p.url || p.perma_url || "",
      songCount: p.song_count || p.songCount || 0,
    }))

    const charts = getArray(data.charts).map((c: any) => ({
      id: c.id,
      name: c.name || c.title || "",
      image: getImg(c.image),
      link: c.url || c.perma_url || "",
    }))

    const albumsItems = getArray(data.albums || data.new_albums)
    const new_trending = albumsItems
      .filter((s: any) => s.type === 'song' || s.download_url || s.downloadUrl)
      .map(formatSong)

    const albums = albumsItems
      .filter((item: any) => item.type === 'album' || !item.download_url)
      .map((alb: any) => ({
        id: alb.id,
        name: alb.name || alb.title || "",
        artist: alb.subtitle || alb.description || "Various Artists",
        image: getImg(alb.image),
        link: alb.url || alb.perma_url || alb.link || "",
      }))

    // Fallback: extract albums from trending if albums row is empty
    if (albums.length === 0) {
      trendingItems
        .filter((item: any) => item.type === 'album' || !item.download_url)
        .forEach((alb: any) => {
          albums.push({
            id: alb.id,
            name: alb.name || alb.title || "",
            artist: alb.subtitle || alb.description || "Various Artists",
            image: getImg(alb.image),
            link: alb.url || alb.perma_url || alb.link || "",
          })
        })
    }

    const seenArtists = new Set<string>()
    const artist_recos: any[] = []

    getArray(data.artist_recos || data.top_artists).forEach((art: any) => {
      if (art.id && !seenArtists.has(art.id)) {
        seenArtists.add(art.id)
        artist_recos.push({
          id: art.id,
          name: art.name || art.title || "",
          image: getImg(art.image),
          link: art.url || art.perma_url || "",
        })
      }
    })

    // Fallback: populate popular artists from songs/albums metadata if artist_recos is empty
    if (artist_recos.length === 0) {
      const allItems = [...trendingItems, ...albumsItems]
      for (const item of allItems) {
        const artistList = item.artist_map?.artists || []
        for (const art of artistList) {
          if (art.id && !seenArtists.has(art.id)) {
            seenArtists.add(art.id)
            artist_recos.push({
              id: art.id,
              name: art.name || "",
              image: getImg(art.image),
              link: art.url || "",
            })
          }
        }
      }
    }

    const top_playlists = featured_playlists // use featured playlists as top playlists fallback
    const result = { trending_songs, featured_playlists, charts, new_trending, top_playlists, albums, artist_recos }
    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    console.warn("Failed to fetch modules, returning empty:", error)
    return { trending_songs: [], featured_playlists: [], charts: [], new_trending: [], top_playlists: [], albums: [], artist_recos: [] }
  }
}

// ── CHARTS by language ──
const CHART_PLAYLIST_IDS: Record<string, string> = {
  hindi: "1134543272",
  punjabi: "1134543511",
  bhojpuri: "1134768973",
  english: "1134595537"
}

export async function fetchCharts(lang = "hindi"): Promise<FormattedSong[]> {
  const cacheKey = `charts_v4:${lang}`
  const cached = getCachedData(cacheKey)
  if (cached) return cached

  const playlistId = CHART_PLAYLIST_IDS[lang.toLowerCase()]
  if (playlistId) {
    try {
      const playlist = await fetchJioSaavnPlaylistById(playlistId)
      if (playlist && playlist.songs && playlist.songs.length > 0) {
        setCachedData(cacheKey, playlist.songs)
        return playlist.songs
      }
    } catch (e) {
      console.warn(`fetchCharts direct playlist fetch failed for lang=${lang}:`, e)
    }
  }

  try {
    // Charts are represented by language trending songs in unofficial API modules payload
    const modules = await fetchModules(lang)
    if (modules && modules.trending_songs && modules.trending_songs.length > 0) {
      const songs = modules.trending_songs.filter((s: FormattedSong) => !s.id.startsWith("fallback_"))
      setCachedData(cacheKey, songs)
      return songs
    }
    return []
  } catch (error) {
    console.warn("fetchCharts failed, returning empty:", error)
    return []
  }
}
