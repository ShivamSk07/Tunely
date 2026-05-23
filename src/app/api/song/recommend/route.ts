import { NextRequest, NextResponse } from "next/server"
import { fetchSongRecommendations } from "@/lib/musicApi"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }

    const songs = await fetchSongRecommendations(id)

    return jsonCached({
      status: "Success",
      data: songs,
    }, 300, 600)
  } catch (error: any) {
    console.error("Song Recommend route error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch recommendations" }, { status: 500 })
  }
}
