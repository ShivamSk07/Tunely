import { NextRequest, NextResponse } from "next/server"
import { searchSongs, fetchSongRecommendations, fetchAlbumDetails, fetchTrending } from "@/lib/musicApi"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id") || ""
    const type = searchParams.get("type") || "featured"
    const name = searchParams.get("name") || ""

    if (!id && !name) {
      return NextResponse.json({ error: "Missing seed parameters" }, { status: 400 })
    }

    let songs: any[] = []

    console.log(`[API Radio Proxy] Resolving radio for seed: id="${id}", type="${type}", name="${name}"`)

    if (type === "song") {
      // Song radio seed
      try {
        songs = await fetchSongRecommendations(id)
      } catch (e) {
        console.warn(`[API Radio] fetchSongRecommendations failed for song id=${id}:`, e)
      }
    } else if (type === "album") {
      // Album radio seed — return album songs
      try {
        const albumDetails = await fetchAlbumDetails(id)
        songs = albumDetails?.songs || []
      } catch (e) {
        console.warn(`[API Radio] fetchAlbumDetails failed for album id=${id}:`, e)
      }
    } else {
      // Artist or Featured radio seeds
      const query = name || id
      try {
        // Query songs of this artist/station name
        const searchResults = await searchSongs(query, "songs")
        songs = searchResults?.songs || []
      } catch (e) {
        console.warn(`[API Radio] searchSongs failed for query="${query}":`, e)
      }
    }

    // Fallback if no songs found
    if (!songs || songs.length === 0) {
      console.warn(`[API Radio] Fallback to trending songs for seed id="${id}"`)
      songs = await fetchTrending()
    }

    // Return under the "data" envelope
    return jsonCached({ status: "Success", data: songs }, 300, 600)
  } catch (error: any) {
    console.error("Error in radio API proxy:", error)
    return NextResponse.json({ error: error.message || "Failed to resolve radio" }, { status: 500 })
  }
}
