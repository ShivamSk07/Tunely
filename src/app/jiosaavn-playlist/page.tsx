import React from "react"
import JioSaavnPlaylistClient from "@/components/JioSaavnPlaylistClient"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { id?: string }
}): Promise<Metadata> {
  const id = searchParams.id || ""
  if (!id) return { title: "Playlist — Tunely" }
  return {
    title: "Playlist — Tunely",
    description: "Listen to this curated playlist on Tunely.",
  }
}

// Page renders instantly — removed blocking await fetchJioSaavnPlaylistById()
// JioSaavnPlaylistClient fetches data client-side with its own React Query hook + skeleton loaders
export default function JioSaavnPlaylistPage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  const id = searchParams.id || ""

  return <JioSaavnPlaylistClient id={id} initialPlaylist={null} />
}
