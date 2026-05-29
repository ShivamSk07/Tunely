import { NextRequest, NextResponse } from "next/server"
import { fetchPlaylistDetails, fetchJioSaavnPlaylistById } from "@/lib/musicApi"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const link = searchParams.get("link")
    const id = searchParams.get("id")

    if (id) {
      // JioSaavn playlist by ID (featured playlists from /modules)
      const data = await fetchJioSaavnPlaylistById(id)
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" }
      })
    }

    if (!link) {
      return NextResponse.json({ error: "Missing link or id parameter" }, { status: 400 })
    }
    const data = await fetchPlaylistDetails(link)
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" }
    })
  } catch (error: any) {
    console.error("Error in playlist API proxy:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch playlist details" }, { status: 500 })
  }
}
