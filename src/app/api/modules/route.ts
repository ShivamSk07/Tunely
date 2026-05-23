import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"

export const revalidate = 300
export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"

function getImage(val: any): string {
  if (!val) return ""
  if (typeof val === 'string') return val.replace("http://", "https://")
  if (Array.isArray(val)) {
    const link = val[2]?.link || val[val.length - 1]?.link || ""
    return link.replace("http://", "https://")
  }
  return ""
}

function formatSong(raw: any) {
  const image = getImage(raw.image)
  let streamUrl = ""
  const urls = raw.download_url || raw.downloadUrl || []
  if (urls.length > 0) {
    streamUrl = (urls[4]?.link || urls[urls.length - 1]?.link || "").replace("http://", "https://")
  }
  const duration = typeof raw.duration === "string" ? parseInt(raw.duration, 10) : (raw.duration || 0)
  return {
    id: raw.id,
    name: raw.name,
    artist: raw.subtitle || (raw.artist_map?.primary_artists?.[0]?.name) || "Unknown Artist",
    image,
    streamUrl,
    duration: isNaN(duration) ? 0 : duration,
    playCount: raw.play_count || raw.playCount || 0,
    url: raw.url || raw.perma_url || "",
  }
}

function formatAlbum(raw: any) {
  return {
    id: raw.id,
    name: raw.name || raw.title || "",
    artist: raw.subtitle || raw.description || "Various Artists",
    image: getImage(raw.image),
    link: raw.url || raw.perma_url || raw.link || "",
  }
}

function formatArtist(raw: any) {
  return {
    id: raw.id,
    name: raw.name || raw.title || "",
    image: getImage(raw.image),
    link: raw.url || raw.perma_url || raw.link || "",
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lang = searchParams.get("lang") || "hindi"

    const res = await fetch(`${BASE_URL}/modules?lang=${encodeURIComponent(lang)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
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

    const trendingItems = getArray(data.trending || data.trending_songs)
    const trending_songs = trendingItems
      .filter((s: any) => s.type === 'song' || s.download_url || s.downloadUrl)
      .map(formatSong)

    const featured_playlists = getArray(data.playlists || data.featured_playlists).map((p: any) => ({
      id: p.id,
      name: p.name || p.title || "",
      image: getImage(p.image),
      link: p.url || p.perma_url || "",
      songCount: p.song_count || p.songCount || 0,
    }))

    const charts = getArray(data.charts).map((c: any) => ({
      id: c.id,
      name: c.name || c.title || "",
      image: getImage(c.image),
      link: c.url || c.perma_url || "",
      songs: getArray(c.songs).filter((s: any) => s.download_url || s.downloadUrl).map(formatSong),
    }))

    const albumsItems = getArray(data.albums || data.new_albums)
    const new_trending = albumsItems
      .filter((s: any) => s.type === 'song' || s.download_url || s.downloadUrl)
      .map(formatSong)

    const top_playlists = featured_playlists // Use featured playlists as top playlists fallback

    const albums = albumsItems
      .filter((item: any) => item.type === 'album' || !item.download_url)
      .map(formatAlbum)

    // Fallback: extract albums from trending if albums row is empty
    if (albums.length === 0) {
      trendingItems
        .filter((item: any) => item.type === 'album' || !item.download_url)
        .forEach((alb: any) => {
          albums.push(formatAlbum(alb))
        })
    }

    const seenArtists = new Set<string>()
    const artist_recos: any[] = []

    getArray(data.artist_recos || data.top_artists).forEach((art: any) => {
      if (art.id && !seenArtists.has(art.id)) {
        seenArtists.add(art.id)
        artist_recos.push(formatArtist(art))
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
              image: getImage(art.image),
              link: art.url || "",
            })
          }
        }
      }
    }

    // Language-specific sections (hindi, punjabi, english)
    const lang_sections: Record<string, any[]> = {}
    for (const l of ["hindi", "punjabi", "english", "tamil", "telugu"]) {
      const key = l === "hindi" ? "trending_songs_hindi" : l === "punjabi" ? "trending_songs_punjabi" : `trending_songs_${l}`
      const raw = getArray(data[key] || data[`${l}_songs`])
      if (raw.length > 0) {
        lang_sections[l] = raw.filter((s: any) => s.download_url || s.downloadUrl).map(formatSong)
      }
    }

    return jsonCached({
      status: "Success",
      data: {
        trending_songs,
        featured_playlists,
        charts,
        new_trending,
        top_playlists,
        albums,
        artist_recos,
        lang_sections,
      },
    }, 300, 600)
  } catch (error: any) {
    console.error("Modules API error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch modules" }, { status: 500 })
  }
}
