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
    const token = searchParams.get("token")
    const type = searchParams.get("type") || "albums"
    const page = searchParams.get("p") || "1"

    if (!token) {
      return NextResponse.json({ error: "Missing token parameter" }, { status: 400 })
    }

    const res = await fetch(
      `${BASE_URL}/get/label?token=${encodeURIComponent(token)}&type=${type}&p=${page}`,
      {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) throw new Error(`Label API returned ${res.status}`)
    const json = await res.json()
    const data = json.data || {}

    const albums = (data.albums?.data || data.albums || []).map((alb: any) => ({
      id: alb.id,
      name: alb.name || alb.title || "",
      artist: alb.subtitle || alb.artist || "Various Artists",
      year: alb.year || "",
      image: getImage(alb.image),
      link: alb.url || alb.perma_url || alb.link || "",
    }))

    const artists = (data.artists || []).map((art: any) => ({
      id: art.id,
      name: art.name || art.title || "",
      image: getImage(art.image),
      link: art.url || art.perma_url || "",
    }))

    const labelName = data.name || data.title || token
    const labelImage = getImage(data.image) || ""

    return jsonCached({
      status: "Success",
      data: { name: labelName, image: labelImage, albums, artists, total: data.albums?.total || albums.length },
    }, 600, 1200)
  } catch (error: any) {
    console.error("Label API error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch label" }, { status: 500 })
  }
}
