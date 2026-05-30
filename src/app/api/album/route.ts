import { NextRequest, NextResponse } from "next/server"
import { fetchAlbumDetails } from "@/lib/musicApi"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const link = searchParams.get("link")
    if (!link) {
      return NextResponse.json({ error: "Missing link parameter" }, { status: 400 })
    }
    const data = await fetchAlbumDetails(link)
    return jsonCached(data, 600, 1800)
  } catch (error: any) {
    console.error("Error in album API proxy:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch album details" }, { status: 500 })
  }
}
