import { NextRequest, NextResponse } from "next/server"
import { fetchArtistDetails } from "@/lib/musicApi"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const link = searchParams.get("link")
    if (!link) {
      return NextResponse.json({ error: "Missing link parameter" }, { status: 400 })
    }
    const data = await fetchArtistDetails(link)
    return jsonCached(data, 300, 600)
  } catch (error: any) {
    console.error("Error in artist API proxy:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch artist details" }, { status: 500 })
  }
}
