import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"

// In-memory lyrics cache — 24h TTL since lyrics never change
interface LyricsEntry { plain: string | null; synced: string | null; expiry: number }
const lyricsCache = new Map<string, LyricsEntry>()

function getLyricsCache(key: string) {
  const entry = lyricsCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) { lyricsCache.delete(key); return null }
  return entry
}
function setLyricsCache(key: string, plain: string | null, synced: string | null) {
  lyricsCache.set(key, { plain, synced, expiry: Date.now() + 86_400_000 })
}

function cleanArtistName(artist: string): string {
  if (!artist) return "";
  let cleaned = artist;
  
  // Remove HTML entity &amp;
  cleaned = cleaned.replace(/&amp;/gi, "&");
  
  // Split on typical multiple artist delimiters to extract the primary search key
  const splitters = [",", ";", "&", "feat.", "ft.", "Feat.", "Ft.", " / ", " - "];
  for (const splitter of splitters) {
    if (cleaned.includes(splitter)) {
      cleaned = cleaned.split(splitter)[0];
    }
  }
  
  // Remove content inside parenthesis or square brackets
  cleaned = cleaned.replace(/\([^)]*\)/g, "");
  cleaned = cleaned.replace(/\[[^\]]*\]/g, "");
  
  return cleaned.trim();
}

function cleanSongName(songName: string): string {
  if (!songName) return "";
  let cleaned = songName;
  
  // Remove typical "From Movie" suffixes in parenthesis/brackets
  cleaned = cleaned.replace(/\(From[^)]*\)/gi, "");
  cleaned = cleaned.replace(/\[From[^\]]*\]/gi, "");
  cleaned = cleaned.replace(/\(From[^)]*$/gi, "");
  
  // Remove general content in parenthesis or square brackets
  cleaned = cleaned.replace(/\([^)]*\)/g, "");
  cleaned = cleaned.replace(/\[[^\]]*\]/g, "");
  
  // Split on hyphen to remove trailing versions (e.g. - Remix, - Lofi)
  if (cleaned.includes(" - ")) {
    cleaned = cleaned.split(" - ")[0];
  }
  
  return cleaned.trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const songName = searchParams.get("songName") || ""
    const artist = searchParams.get("artist") || ""
    const lyricsId = searchParams.get("lyricsId") || ""

    // Check in-memory cache first
    const cacheKey = lyricsId || `${songName}::${artist}`
    const hit = getLyricsCache(cacheKey)
    if (hit) {
    return jsonCached({ plain: hit.plain, synced: hit.synced }, 86400, 86400)
    }

    // Query all internal lyrics engines in parallel to eliminate sequential blocking delays!
    const results = await Promise.allSettled([
      // Engine A: ID-based lookup
      (async () => {
        if (!lyricsId) return null
        try {
          const res = await fetch(`${BASE_URL}/songs?id=${encodeURIComponent(lyricsId)}`, {
            signal: AbortSignal.timeout(1800),
            next: { revalidate: 86400 }
          })
          if (res.ok) {
            const json = await res.json()
            const songData = Array.isArray(json) ? json[0] : (json.data?.[0] || json.data || json)
            if (songData?.lyrics?.text) {
              return { plain: songData.lyrics.text, synced: null }
            }
          }
        } catch {
          // Timeout or error handled gracefully
        }
        return null
      })(),

      // Engine B: Metadata-based direct lookup
      (async () => {
        if (!songName && !artist) return null
        try {
          const cleanArtist = cleanArtistName(artist)
          const cleanSong = cleanSongName(songName)
          const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanSong)}`
          
          const res = await fetch(url, {
            headers: { "User-Agent": "Tunely Core Music Service (https://tunely.music)" },
            signal: AbortSignal.timeout(1500),
            next: { revalidate: 86400 }
          })
          if (res.ok) {
            const json = await res.json()
            return {
              plain: json.plainLyrics || json.lyrics || null,
              synced: json.syncedLyrics || null
            }
          }
        } catch {
          // Timeout or error handled gracefully
        }
        return null
      })(),

      // Engine C: Search-based query lookup
      (async () => {
        if (!songName && !artist) return null
        try {
          const cleanArtist = cleanArtistName(artist)
          const cleanSong = cleanSongName(songName)
          const query = `${cleanSong} ${cleanArtist}`
          const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`

          const res = await fetch(url, {
            headers: { "User-Agent": "Tunely Core Music Service (https://tunely.music)" },
            signal: AbortSignal.timeout(2000),
            next: { revalidate: 86400 }
          })
          if (res.ok) {
            const results = await res.json()
            if (Array.isArray(results) && results.length > 0) {
              // Scan first few search matches to find one that has synced lyrics
              const syncedMatch = results.slice(0, 5).find((r: any) => r.syncedLyrics && r.syncedLyrics.trim().length > 0)
              const match = syncedMatch || results[0]
              return {
                plain: match.plainLyrics || match.lyrics || null,
                synced: match.syncedLyrics || null
              }
            }
          }
        } catch {
          // Timeout or error handled gracefully
        }
        return null
      })()
    ])

    const resA = results[0].status === "fulfilled" ? results[0].value : null
    const resB = results[1].status === "fulfilled" ? results[1].value : null
    const resC = results[2].status === "fulfilled" ? results[2].value : null

    let plain: string | null = null
    let synced: string | null = null

    // Prioritize Synced lyrics first, then fallback to Plain lyrics
    if (resB && resB.synced) {
      plain = resB.plain
      synced = resB.synced
    } else if (resC && resC.synced) {
      plain = resC.plain
      synced = resC.synced
    } else if (resA && resA.plain) {
      plain = resA.plain
    } else {
      plain = resB?.plain || resC?.plain || null
    }

    setLyricsCache(cacheKey, plain, synced)
    return jsonCached({ plain, synced }, 86400, 86400)
  } catch (error: any) {
    console.error("Tunely lyrics core engine error:", error)
    return NextResponse.json({ error: "Failed to load lyrics from database" }, { status: 500 })
  }
}
