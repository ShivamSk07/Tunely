import React from "react"
import ArtistClient from "@/components/ArtistClient"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { link?: string }
}): Promise<Metadata> {
  const link = searchParams.link || ""
  if (!link) return { title: "Artist — Tunely" }
  return {
    title: "Artist — Tunely",
    description: "Stream top tracks and albums from your favorite artist on Tunely with zero ads.",
  }
}

// Page renders instantly — removed blocking await queryClient.prefetchQuery() 
// ArtistClient fetches data client-side with its own React Query hook + skeleton loaders
export default function ArtistDetailsPage({
  searchParams,
}: {
  searchParams: { link?: string }
}) {
  const link = searchParams.link || ""

  return <ArtistClient link={link} />
}
