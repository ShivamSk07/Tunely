"use client"

import React, { useEffect, useState } from "react"
import AddToPlaylistModal from "@/components/AddToPlaylistModal"
import AuthModal from "@/components/AuthModal"
import { Song } from "@/store/usePlayerStore"

export default function GlobalModalWrapper() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<Song>
      setSelectedSong(customEvent.detail)
    }
    window.addEventListener("trigger-add-to-playlist", handleTrigger as EventListener)
    return () => window.removeEventListener("trigger-add-to-playlist", handleTrigger as EventListener)
  }, [])

  return (
    <>
      <AuthModal />
      {selectedSong && (
        <AddToPlaylistModal 
          song={selectedSong} 
          onClose={() => setSelectedSong(null)} 
        />
      )}
    </>
  )
}
