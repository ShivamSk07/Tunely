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

    let artists: any[] = []

    try {
      const res = await fetch(`${BASE_URL}/artist/recommend?id=${id}`, { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        const recList = json.data || []
        if (Array.isArray(recList) && recList.length > 0) {
          artists = recList.map((art: any) => ({
            id: art.id,
            name: art.name || art.title,
            artist: art.role || art.subtitle || "Artist",
            image: (art.image && art.image[2]?.link) || (art.image && art.image[art.image.length - 1]?.link) || "",
            link: art.url || art.link || "",
          }))
        }
      }
    } catch (e) {
      console.error("Failed to fetch artist recommendations directly:", e)
    }

    // Fallback: Return a beautiful, curated selection of popular artists
    if (artists.length === 0) {
      try {
        console.log("Artist Recommend Fallback: Querying popular artists");
        // We'll search for popular artist profiles to get details
        const popularQuery = "Arijit Singh,Shreya Ghoshal,Jubin Nautiyal,Neha Kakkar,Atif Aslam,AP Dhillon,Diljit Dosanjh"
        const popularList = popularQuery.split(",")
        
        // Fetch in parallel for ultimate speed!
        const promises = popularList.slice(0, 6).map(async (name) => {
          try {
            const res = await fetch(`${BASE_URL}/search/artists?q=${encodeURIComponent(name)}`, { cache: "no-store" })
            if (res.ok) {
              const json = await res.json()
              const artistObj = json.data?.results?.[0]
              if (artistObj) {
                return {
                  id: artistObj.id,
                  name: artistObj.name || artistObj.title,
                  artist: artistObj.role || artistObj.subtitle || "Artist",
                  image: (artistObj.image && artistObj.image[2]?.link) || (artistObj.image && artistObj.image[artistObj.image.length - 1]?.link) || "",
                  link: artistObj.url || artistObj.link || "",
                }
              }
            }
          } catch (e) {
            console.error(`Failed to fetch fallback artist search for ${name}:`, e)
          }
          return null
        })

        const fallbackResults = await Promise.all(promises)
        artists = fallbackResults.filter(Boolean) as any[]
      } catch (e) {
        console.error("Artist recommendation fallback failed:", e)
      }
    }

    // Deduplicate
    const seenIds = new Set<string>()
    const deduped = artists.filter((a) => {
      if (seenIds.has(a.id) || a.id === id) return false
      seenIds.add(a.id)
      return true
    })

    return NextResponse.json({
      status: "Success",
      data: deduped,
    })
  } catch (error: any) {
    console.error("Artist Recommend route error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch artist recommendations" }, { status: 500 })
  }
}
