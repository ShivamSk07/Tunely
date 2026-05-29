import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"
import { fetchCharts } from "@/lib/musicApi"

export const revalidate = 300
export const dynamic = "force-dynamic"

const SUPPORTED_LANGS = ["hindi", "punjabi", "bhojpuri", "english", "tamil", "telugu"]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lang = searchParams.get("lang") || "hindi"

    // Only allow supported languages
    const validLang = SUPPORTED_LANGS.includes(lang) ? lang : "hindi"

    const songs = await fetchCharts(validLang)

    return NextResponse.json(
      { status: "Success", data: songs },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    )
  } catch (error: any) {
    console.error("Charts API error:", error)
    return NextResponse.json({ status: "Success", data: [] }, { status: 200 })
  }
}
