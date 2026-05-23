import { NextRequest, NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"

export const revalidate = 3600
export const dynamic = "force-dynamic"

const BASE_URL = process.env.MUSIC_API_URL || "https://my-repo-kohl-eta.vercel.app"

function getImage(arr: any[] | undefined): string {
  if (!arr || arr.length === 0) return ""
  return (arr[2]?.link || arr[arr.length - 1]?.link || "").replace("http://", "https://")
}

const STATIC_MIXES = [
  {
    id: "hindi-hits-mix",
    name: "Hindi Hits Mix",
    description: "The absolute best Bollywood releases and popular chart-busters.",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60",
    link: "https://www.jiosaavn.com/featured/weekly-jiotunes-hindi/JdZ8eB4p6wY_",
  },
  {
    id: "punjabi-beats-mix",
    name: "Punjabi Beats Mix",
    description: "Energetic and powerful Punjabi anthems to keep you moving.",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
    link: "https://www.jiosaavn.com/featured/punjabi-weekly-jiotunes/82sK7wJvF1U_",
  },
  {
    id: "english-pop-mix",
    name: "English Pop Mix",
    description: "Top global hits and fresh electronic pop vibes.",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
    link: "https://www.jiosaavn.com/featured/weekly-jiotunes-english/M,S,4Gsl44w_",
  },
  {
    id: "bollywood-lofi-mix",
    name: "Bollywood Lofi Mix",
    description: "Chill vibes, aesthetics, and lo-fi edits of iconic Hindi tunes.",
    image: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=60",
    link: "https://www.jiosaavn.com/featured/lofi-chill---hindi/o,1L-pLhF9Q_",
  },
  {
    id: "retro-romance-mix",
    name: "Retro Romance Mix",
    description: "Take a nostalgic trip with timeless golden Bollywood melodies.",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60",
    link: "https://www.jiosaavn.com/featured/retro-romance---hindi/4B54,BScTcc_",
  },
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lang = searchParams.get("lang") || "hindi,punjabi"

    // Try live API first
    try {
      const res = await fetch(`${BASE_URL}/get/mix?lang=${encodeURIComponent(lang)}`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const json = await res.json()
        const raw = json.data || []
        if (raw.length > 0) {
          const mixes = raw.map((m: any) => ({
            id: m.id,
            name: m.name || m.title || "",
            description: m.subtitle || m.description || "Curated Playlist",
            image: getImage(m.image),
            link: m.url || m.perma_url || m.link || "",
          }))
          return jsonCached({ status: "Success", data: mixes }, 3600, 7200)
        }
      }
    } catch (e) {
      console.warn("Live mix API failed, using static data:", e)
    }

    // Fallback to static
    return jsonCached({ status: "Success", data: STATIC_MIXES }, 86400, 86400)
  } catch (error: any) {
    console.error("Mixes API error:", error)
    return NextResponse.json({ status: "Success", data: STATIC_MIXES }, { status: 200 })
  }
}
