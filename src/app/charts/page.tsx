import ChartsClient from "@/components/ChartsClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Top Charts — Tunely",
  description: "Discover the most played songs in Hindi, Punjabi, English, Tamil, and Telugu on Tunely.",
}

// Page renders instantly — ChartsClient fetches data client-side via React Query
// This eliminates the blocking server fetch that caused slow page navigation
export default function ChartsPage() {
  return <ChartsClient initialSongs={[]} initialLang="hindi" />
}
