import HomeClient from "@/components/HomeClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tunely — Stream Music Free",
  description:
    "Listen to trending Bollywood, Hindi, Punjabi, and global hits for free on Tunely. No account required.",
}

// Page renders instantly — HomeClient uses React Query to fetch data client-side
// This eliminates the blocking Suspense + server fetch that caused page switching lag
export default function HomePage() {
  return (
    <HomeClient
      initialModules={null}
      initialTrending={[]}
      initialAlbums={[]}
    />
  )
}
