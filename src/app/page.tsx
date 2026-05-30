import HomeClient from "@/components/HomeClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tunely — Stream Music Free",
  description:
    "Listen to trending Bollywood, Hindi, Punjabi, and global hits for free on Tunely. No account required.",
}

// Revalidate homepage content every 5 minutes (300 seconds)
export const revalidate = 300

export default async function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://my-repo-kohl-eta.vercel.app"
  
  try {
    const res = await fetch(`${apiUrl}/modules?lang=hindi`, {
      next: { revalidate: 300 },
    })
    
    if (!res.ok) {
      throw new Error(`Modules API returned status: ${res.status}`)
    }
    
    const json = await res.json()
    const data = json?.data || null
    
    return <HomeClient modules={data} />
  } catch (err) {
    console.error("Failed to load server-side modules on home:", err)
    // Pass null so HomeClient renders skeletons / fallback gracefully rather than crashing
    return <HomeClient modules={null} />
  }
}
