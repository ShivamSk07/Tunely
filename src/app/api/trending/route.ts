import { NextResponse } from "next/server"
import { fetchTrending } from "@/lib/musicApi"
import { jsonCached } from "@/lib/apiResponse"

export const revalidate = 300 // Next.js ISR: revalidate every 5 minutes

export async function GET() {
  try {
    const data = await fetchTrending()
    return jsonCached(data, 300, 600)
  } catch (error: any) {
    console.error("Error in trending API proxy:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch trending songs" }, { status: 500 })
  }
}
