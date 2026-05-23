import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"

export const revalidate = 300
export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"

function getImage(arr: any[] | undefined): string {
  if (!arr || arr.length === 0) return ""
  return (arr[2]?.link || arr[arr.length - 1]?.link || "").replace("http://", "https://")
}

const SUPPORTED_LANGS = ["hindi", "punjabi", "bhojpuri", "english", "tamil", "telugu"]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lang = searchParams.get("lang") || "hindi"

    // Only allow supported languages
    const validLang = SUPPORTED_LANGS.includes(lang) ? lang : "hindi"

    const res = await fetch(
      `${BASE_URL}/get/trending?type=song&lang=${validLang}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) throw new Error(`Charts API returned ${res.status}`)
    const json = await res.json()

    const raw = json.data || []
    const songs = raw
      .filter((item: any) => item.type === "song" || item.download_url || item.downloadUrl)
      .map((raw: any) => {
        const image = getImage(raw.image)
        const urls = raw.download_url || raw.downloadUrl || []
        const streamUrl = urls.length > 0
          ? (urls[4]?.link || urls[urls.length - 1]?.link || "").replace("http://", "https://")
          : ""
        const duration = typeof raw.duration === "string" ? parseInt(raw.duration, 10) : (raw.duration || 0)
        return {
          id: raw.id,
          name: raw.name,
          artist: raw.subtitle || raw.primaryArtists || "Unknown Artist",
          image,
          streamUrl,
          duration: isNaN(duration) ? 0 : duration,
          playCount: raw.play_count || raw.playCount || 0,
        }
      })

    return jsonCached({ status: "Success", data: songs }, 300, 600)
  } catch (error: any) {
    console.error("Charts API error:", error)
    return NextResponse.json({ status: "Success", data: [] }, { status: 200 })
  }
}
