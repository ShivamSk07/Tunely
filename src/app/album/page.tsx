import React from "react"
import AlbumClient from "@/components/AlbumClient"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { link?: string }
}): Promise<Metadata> {
  const link = searchParams.link || ""
  if (!link) return { title: "Album — Tunely" }
  return {
    title: "Album — Tunely",
    description: "Listen to this album on Tunely with full 320kbps streams.",
  }
}

// Page renders instantly — removed blocking await queryClient.prefetchQuery()
// AlbumClient fetches data client-side with its own React Query hook + skeleton loaders
export default function AlbumDetailsPage({
  searchParams,
}: {
  searchParams: { link?: string }
}) {
  const link = searchParams.link || ""

  return <AlbumClient link={link} />
}
