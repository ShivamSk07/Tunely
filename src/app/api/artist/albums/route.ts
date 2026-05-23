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
      `${BASE_URL}/artist/albums?id=${id}&page=${page}&cat=${cat}&sort=${sort}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) throw new Error(`Artist albums API returned ${res.status}`)
    const json = await res.json()

    const rawAlbums = json.data?.albums || json.data || []
    const albums = rawAlbums.map((raw: any) => ({
      id: raw.id,
      name: raw.name || raw.title || "",
      artist: raw.subtitle || raw.artist || "Various Artists",
      year: raw.year || "",
      image: getImage(raw.image),
      link: raw.url || raw.perma_url || raw.link || "",
    }))

    const total = json.data?.total || albums.length

    return jsonCached({ status: "Success", data: albums, total }, 300, 600)
  } catch (error: any) {
    console.error("Artist albums API error:", error)
    return NextResponse.json({ status: "Success", data: [], total: 0 }, { status: 200 })
  }
}
