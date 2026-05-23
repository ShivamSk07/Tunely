import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"
const API_TIMEOUT_MS = 10000

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const link = searchParams.get("link")
    const id = searchParams.get("id")

    if (!link && !id) {
      return NextResponse.json({ error: "Missing link or id parameter" }, { status: 400 })
    }

    let data: any = null

    // Try fetching by ID first (faster)
    if (id) {
      const res = await fetch(`${BASE_URL}/songs?id=${encodeURIComponent(id)}`, {
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        next: { revalidate: 3600 }
      })
      if (res.ok) {
        const json = await res.json()
        data = json.data || json
      }
    }

    // Fallback to link-based lookup
    if (!data && link) {
      const res = await fetch(`${BASE_URL}/song?link=${encodeURIComponent(link)}`, {
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
        next: { revalidate: 3600 }
      })
      if (!res.ok) throw new Error("Failed to fetch song details from API")
      const json = await res.json()
      data = json.data || json
    }

    if (!data) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    // Normalize: data may be an array or single object
    const raw = Array.isArray(data) ? data[0] : (data.songs?.[0] || data)

    if (!raw || !raw.id) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    const getImage = (imgs: any[]) => {
      if (!imgs?.length) return ""
      return (imgs[2]?.link || imgs[imgs.length - 1]?.link || "").replace("http://", "https://")
    }
    const getStream = (urls: any[]) => {
      if (!urls?.length) return ""
      return (urls[4]?.link || urls[urls.length - 1]?.link || "").replace("http://", "https://")
    }

    const duration = typeof raw.duration === "string" ? parseInt(raw.duration, 10) : (raw.duration || 0)

    const formatted = {
      id: raw.id,
      name: raw.name,
      artist: raw.subtitle || raw.primaryArtists || "Unknown Artist",
      image: getImage(raw.image),
      streamUrl: getStream(raw.download_url || raw.downloadUrl),
      duration: isNaN(duration) ? 0 : duration,
      has_lyrics: raw.has_lyrics || raw.hasLyrics || false,
      lyrics: raw.lyrics || null,
      playCount: raw.play_count || raw.playCount || 0,
      year: raw.year || "",
      url: raw.url || raw.perma_url || "",
    }

    return jsonCached(formatted, 3600, 7200)
  } catch (error: any) {
    console.error("Error in song API proxy:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch song details" }, { status: 500 })
  }
}
