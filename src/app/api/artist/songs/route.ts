import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"

function getImage(arr: any[] | undefined): string {
  if (!arr || arr.length === 0) return ""
  return (arr[2]?.link || arr[arr.length - 1]?.link || "").replace("http://", "https://")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const page = searchParams.get("page") || "1"
    const cat = searchParams.get("cat") || "latest"
    const sort = searchParams.get("sort") || "desc"

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }

    const res = await fetch(
      `${BASE_URL}/artist/songs?id=${id}&page=${page}&cat=${cat}&sort=${sort}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) throw new Error(`Artist songs API returned ${res.status}`)
    const json = await res.json()

    const rawSongs = json.data?.songs || json.data || []
    const songs = rawSongs.map((raw: any) => {
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

    const total = json.data?.total || songs.length

    return jsonCached({ status: "Success", data: songs, total }, 300, 600)
  } catch (error: any) {
    console.error("Artist songs API error:", error)
    return NextResponse.json({ status: "Success", data: [], total: 0 }, { status: 200 })
  }
}
