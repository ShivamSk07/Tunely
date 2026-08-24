"use client"

import React, { useEffect } from "react"
import { useJamStore } from "@/store/useJamStore"
import { jamManager } from "@/lib/jamManager"
import toast from "react-hot-toast"

export default function JamUrlListener() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    const jamParam = params.get("jam")

    if (jamParam) {
      const formattedCode = jamParam.startsWith("tunely-") ? jamParam : `tunely-${jamParam}`
      useJamStore.getState().setJamModalOpen(true)

      // Clean the query param from the URL cleanly without reloading
      const newUrl = window.location.pathname
      window.history.replaceState({}, "", newUrl)

      const joinToast = toast.loading(`Joining Jam "${formattedCode}"...`)
      jamManager
        .joinRoom(formattedCode, "Listener")
        .then(() => {
          toast.dismiss(joinToast)
          toast.success("Joined Jam! Playback is now synchronized.")
        })
        .catch(() => {
          toast.dismiss(joinToast)
          toast.error("Could not auto-join Jam. Room may be closed.")
        })
    }
  }, [])

  return null
}
