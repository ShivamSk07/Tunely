import { NextRequest, NextResponse } from "next/server"
import { searchSongs } from "@/lib/musicApi"
import { jsonCached } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query")
    const type = searchParams.get("type") || undefined
    
    const lang = searchParams.get("lang") || "hindi"
    
    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 })
    }
    
    const validatedType = type === "songs" ? "songs" : "all"
    const data = await searchSongs(query, validatedType, lang)
    return jsonCached(data, 300, 600)
  } catch (error: any) {
    console.error("Error in search API proxy:", error)
    return NextResponse.json({ error: error.message || "Failed to search" }, { status: 500 })
  }
}
