import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }

    let albums: any[] = []

    try {
      const res = await fetch(`${BASE_URL}/album/recommend?id=${id}`, { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        const recList = json.data || []
        if (Array.isArray(recList) && recList.length > 0) {
          albums = recList.map((alb: any) => ({
            id: alb.id,
            name: alb.name || alb.title,
            artist: alb.subtitle || alb.description || "Album",
            image: (alb.image && alb.image[2]?.link) || (alb.image && alb.image[alb.image.length - 1]?.link) || "",
            link: alb.url || alb.link || "",
          }))
        }
      }
    } catch (e) {
      console.error("Failed to fetch album recommendations directly:", e)
    }

    // Fallback: Fetch trending albums
    if (albums.length === 0) {
      try {
        console.log("Album Recommend Fallback: Fetching trending albums");
        const trendingRes = await fetch(`${BASE_URL}/get/trending`, { cache: "no-store" })
        if (trendingRes.ok) {
          const trendingJson = await trendingRes.json()
          const raw: any[] = trendingJson.data || []
          const rawAlbums = raw.filter((item: any) => item.type === "album")
          albums = rawAlbums.map((alb: any) => ({
            id: alb.id,
            name: alb.name || alb.title,
            artist: alb.subtitle || alb.description || "Trending Album",
            image: alb.image?.[2]?.link || alb.image?.[alb.image.length - 1]?.link || "",
            link: alb.url || alb.link || "",
          }))
        }
      } catch (e) {
        console.error("Album recommend fallback failed:", e)
      }
    }

    // Deduplicate
    const seenIds = new Set<string>()
    const deduped = albums.filter((a) => {
      if (seenIds.has(a.id) || a.id === id) return false
      seenIds.add(a.id)
      return true
    })

    return NextResponse.json({
      status: "Success",
      data: deduped,
    })
  } catch (error: any) {
    console.error("Album Recommend route error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch album recommendations" }, { status: 500 })
  }
}
