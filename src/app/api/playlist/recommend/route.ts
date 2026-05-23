import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }

    const res = await fetch(`${BASE_URL}/playlist/recommend?id=${id}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`Playlist recommend API returned ${res.status}`)
    const json = await res.json()

    const data = (json.data || []).map((p: any) => ({
      id: p.id,
      name: p.name || p.title || "",
      image: (p.image && (p.image[2]?.link || p.image[p.image.length - 1]?.link) || "").replace("http://", "https://"),
      link: p.url || p.perma_url || "",
      songCount: p.song_count || p.songCount || 0,
    }))

    return jsonCached({ status: "Success", data }, 600, 1200)
  } catch (error: any) {
    console.error("Playlist recommend API error:", error)
    return NextResponse.json({ status: "Success", data: [] }, { status: 200 })
  }
}
