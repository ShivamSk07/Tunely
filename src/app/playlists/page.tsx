import { Suspense } from "react"
import { fetchModules } from "@/lib/musicApi"
import PlaylistsClient from "@/components/PlaylistsClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Featured Playlists — Tunely",
  description: "Explore curated Hindi, Punjabi and English playlists on Tunely.",
}

export const revalidate = 300

async function PlaylistsContent() {
  const modules = await fetchModules("hindi").catch(() => null)
  const playlists = modules?.featured_playlists || []
  return <PlaylistsClient initialPlaylists={playlists} />
}

export default function PlaylistsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full pb-36 md:pb-12 px-4 md:px-6 py-6 animate-pulse">
        <div className="space-y-4">
          {/* Header Shimmer */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#1a1a24] flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-[#1a1a24] rounded-md w-36" />
              <div className="h-4 bg-[#1a1a24] rounded-md w-48" />
            </div>
          </div>
          {/* Playlist Cards Shimmer */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-[#181818] p-3 rounded-xl space-y-3 h-[220px] border border-white/5">
                <div className="aspect-square rounded-lg bg-[#282828] w-full" />
                <div className="h-4 bg-[#282828] rounded w-3/4" />
                <div className="h-3 bg-[#282828] rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <PlaylistsContent />
    </Suspense>
  )
}
