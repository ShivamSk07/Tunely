"use client"

import React, { useEffect, useRef } from "react"
import { usePlayerStore } from "@/store/usePlayerStore"
import { useSession } from "next-auth/react"

export default function AudioPlayer() {
  const { data: session } = useSession()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const filtersRef = useRef<Record<string, BiquadFilterNode>>({})
  
  const {
    currentSong,
    isPlaying,
    volume,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    next,
    currentTime,
    eqBands,
    hydrateStore,
    prefetchLyrics,
  } = usePlayerStore()

  const sleepTimerRemaining = usePlayerStore((state) => state.sleepTimerRemaining)
  const decrementSleepTimer = usePlayerStore((state) => state.decrementSleepTimer)

  // Safe client-side store hydration on mount
  useEffect(() => {
    hydrateStore()
  }, [hydrateStore])

  // Prefetch lyrics in background on track change
  useEffect(() => {
    if (currentSong) {
      prefetchLyrics(currentSong)
    }
  }, [currentSong, prefetchLyrics])

  // Sleep Timer background interval
  useEffect(() => {
    if (sleepTimerRemaining === null) return
    const intervalId = setInterval(() => {
      decrementSleepTimer()
    }, 1000)
    return () => clearInterval(intervalId)
  }, [sleepTimerRemaining, decrementSleepTimer])

  // Initialize Web Audio API for EQ
  useEffect(() => {
    if (!audioRef.current) return

    const initAudioContext = () => {
      if (audioContextRef.current) return

      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioContextClass()
        audioContextRef.current = ctx

        // Force anonymous crossOrigin for CORS compatibility with Web Audio API
        audioRef.current!.crossOrigin = "anonymous"

        // Create Source node (ONLY ONCE)
        const source = ctx.createMediaElementSource(audioRef.current!)
        sourceNodeRef.current = source

        // Bands: sub (60Hz), bass (250Hz), mid (1kHz), presence (4kHz), treble (16kHz)
        const bandsConfig = [
          { key: "sub", freq: 60, type: "lowshelf" as const },
          { key: "bass", freq: 250, type: "peaking" as const },
          { key: "mid", freq: 1000, type: "peaking" as const },
          { key: "presence", freq: 4000, type: "peaking" as const },
          { key: "treble", freq: 16000, type: "highshelf" as const }
        ]

        const filters: Record<string, BiquadFilterNode> = {}
        let lastNode: AudioNode = source

        bandsConfig.forEach((config) => {
          const filter = ctx.createBiquadFilter()
          filter.type = config.type
          filter.frequency.value = config.freq
          filter.Q.value = 1.0
          filter.gain.value = eqBands[config.key] ?? 0
          
          lastNode.connect(filter)
          lastNode = filter
          filters[config.key] = filter
        })

        lastNode.connect(ctx.destination)
        filtersRef.current = filters
      } catch (err) {
        console.error("Failed to initialize Web Audio Equalizer:", err)
      }
    }

    if (isPlaying) {
      initAudioContext()
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(console.error)
      }
    }
  }, [isPlaying, eqBands])

  // Sync EQ changes dynamically
  useEffect(() => {
    Object.keys(filtersRef.current).forEach((key) => {
      const filter = filtersRef.current[key]
      if (filter) {
        const gainVal = eqBands[key] ?? 0
        if (audioContextRef.current) {
          // Smooth the transition to prevent click/pop sounds
          filter.gain.setTargetAtTime(gainVal, audioContextRef.current.currentTime, 0.01)
        } else {
          filter.gain.value = gainVal
        }
      }
    })
  }, [eqBands])

  // Sync currentSong and play state with HTML5 audio
  useEffect(() => {
    if (!audioRef.current || !currentSong) return

    // Only update src if it changed to prevent resetting audio timeline
    if (audioRef.current.src !== currentSong.streamUrl) {
      audioRef.current.src = currentSong.streamUrl
      audioRef.current.load()
    }

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error("Playback failed:", err)
        setIsPlaying(false)
      })
    } else {
      audioRef.current.pause()
    }

    // Broadcast host playback state to Jam room listeners
    if (currentSong) {
      import("@/lib/jamManager").then(({ jamManager }) => {
        jamManager.broadcast({
          type: isPlaying ? "PLAY" : "PAUSE",
          timestamp: Date.now(),
        })
      })
    }
  }, [isPlaying, currentSong, setIsPlaying])

  // Sync Volume
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
  }, [volume])

  // Handle manual seeking from store & broadcast to Jam
  useEffect(() => {
    if (!audioRef.current) return
    const diff = Math.abs(audioRef.current.currentTime - currentTime)
    if (diff > 1.5) {
      audioRef.current.currentTime = currentTime

      import("@/lib/jamManager").then(({ jamManager }) => {
        jamManager.broadcast({
          type: "SEEK",
          time: currentTime,
          timestamp: Date.now(),
        })
      })
    }
  }, [currentTime])

  // Add to recently played when song starts
  useEffect(() => {
    if (!currentSong || !session?.user) return

    const timer = setTimeout(async () => {
      try {
        await fetch("/api/library/recent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songId: currentSong.id,
            songName: currentSong.name,
            artist: currentSong.artist,
            image: currentSong.image,
            streamUrl: currentSong.streamUrl,
          }),
        })
      } catch (error) {
        console.error("Failed to save recently played track:", error)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [currentSong, session?.user])

  // ── MEDIA SESSION API (lock screen / OS media controls) ──
  useEffect(() => {
    if (!currentSong || typeof navigator === "undefined" || !("mediaSession" in navigator)) return

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.name,
        artist: currentSong.artist,
        album: "",
        artwork: currentSong.image
          ? [{ src: currentSong.image, sizes: "500x500", type: "image/jpeg" }]
          : [],
      })

      navigator.mediaSession.setActionHandler("play", () => {
        usePlayerStore.getState().play()
      })
      navigator.mediaSession.setActionHandler("pause", () => {
        usePlayerStore.getState().pause()
      })
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        usePlayerStore.getState().next()
      })
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        usePlayerStore.getState().prev()
      })

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused"
    } catch (e) {
      console.warn("Media Session API not available:", e)
    }
  }, [currentSong, isPlaying])

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
  }

  const handleDurationChange = () => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }

  const handleEnded = () => {
    next()
  }

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onDurationChange={handleDurationChange}
      onEnded={handleEnded}
      preload="auto"
      crossOrigin="anonymous"
    />
  )
}
