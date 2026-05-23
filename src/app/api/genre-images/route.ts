import { NextResponse } from "next/server"
import { jsonCached } from "@/lib/apiResponse"


// This route serves premium, curated, high-definition music-themed photography 
// for mood mix category thumbnails. By using high-quality static assets, we avoid 
// 6 slow parallel search API fetches on initial load, dropping load time to 0ms.
export const dynamic = "force-static"
export const revalidate = 86400 // Cache statically for 24 hours

const GENRE_IMAGES: Record<string, string> = {
  Chill: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=600&auto=format&fit=crop",
  Bollywood: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop",
  Workout: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop",
  Sufi: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop",
  Party: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop",
  Romantic: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop",
  Devotional: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop"
}

export async function GET() {
  return jsonCached(GENRE_IMAGES)
}
