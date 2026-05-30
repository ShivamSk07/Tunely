"use client"

import React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Play, Pause, Disc, Radio, RadioReceiver } from "lucide-react"
import { Song, usePlayerStore } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

interface UniversalCardProps {
  id: string
  name: string
  subtitle: string
  type: string
  image: string
  url: string
}

function formatRawSongToPlayerSong(raw: any): Song {
  let streamUrl = ""
  const urls = raw.download_url || raw.downloadUrl || []
  if (urls.length > 0) {
    streamUrl = (urls[4]?.link || urls[urls.length - 1]?.link || "").replace("http://", "https://")
  }
  const duration = typeof raw.duration === "string" ? parseInt(raw.duration, 10) : (raw.duration || 0)
  return {
    id: raw.id || "",
    name: raw.name || raw.title || "",
    artist: raw.subtitle || (raw.artist_map?.primary_artists?.[0]?.name) || "Unknown Artist",
    image: (raw.image || "").replace("http://", "https://"),
    streamUrl,
    duration: isNaN(duration) ? 0 : duration,
    url: raw.url || raw.perma_url || raw.link || "",
  }
}

export default function UniversalCard({ id, name, subtitle, type, image, url }: UniversalCardProps) {
  const router = useRouter()
  const [imgFailed, setImgFailed] = React.useState(false)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const play = usePlayerStore((state) => state.play)
  const pause = usePlayerStore((state) => state.pause)
  const startRadioMode = usePlayerStore((state) => state.startRadioMode)

  const isCurrentSong = type === "song" && currentSong?.id === id
  const isCurrentPlaying = isCurrentSong && isPlaying

  const startFeaturedRadio = async () => {
    const resolveToast = toast.loading(`Starting Radio "${name}"...`)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://my-repo-kohl-eta.vercel.app"
      const res = await fetch(`${apiBase}/radio/songs?id=${encodeURIComponent(id)}&type=featured`)
      if (!res.ok) throw new Error("API failed")
      
      const json = await res.json()
      const rawSongs = json?.data || []
      if (rawSongs.length === 0) {
        throw new Error("No songs returned")
      }
      
      const formattedSongs = rawSongs.map(formatRawSongToPlayerSong)
      toast.dismiss(resolveToast)
      
      setQueue(formattedSongs, 0)
      toast.success(`Playing Radio "${name}"!`)
    } catch (err: any) {
      toast.dismiss(resolveToast)
      console.error("Radio playback error:", err)
      
      try {
        toast.loading("Generating station songs...", { id: "radio-fallback", duration: 1500 })
        await startRadioMode(id, "song", name)
      } catch (fallbackErr) {
        toast.error("Could not load radio station songs.")
      }
    }
  }

  const handleCardClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (type === "song") {
      if (isCurrentSong) {
        if (isPlaying) pause(); else play()
      } else {
        const rawItem = { id, name, subtitle, type, image, url }
        const songToPlay = formatRawSongToPlayerSong(rawItem)

        if (!songToPlay.streamUrl && url) {
          const resolveToast = toast.loading("Resolving song audio stream...")
          try {
            const res = await fetch(`/api/song?link=${encodeURIComponent(url)}`)
            if (!res.ok) throw new Error("Resolve failed")
            const detailedSong = await res.json()
            toast.dismiss(resolveToast)
            setQueue([detailedSong], 0)
          } catch {
            toast.dismiss(resolveToast)
            toast.error("Could not stream this song.")
          }
        } else {
          setQueue([songToPlay], 0)
        }
      }
    } else if (type === "radio_station") {
      await startFeaturedRadio()
    } else if (type === "album") {
      router.push(`/album?link=${encodeURIComponent(url)}`)
    } else if (type === "playlist") {
      router.push(`/jiosaavn-playlist?id=${id}`)
    } else if (type === "artist") {
      const cleaned = url ? url.replace("internal-site.jiosaavn.com/s/", "www.jiosaavn.com/") : ""
      const hasArtistPrefix = cleaned.startsWith("https://www.jiosaavn.com/artist/")
      
      if (hasArtistPrefix) {
        // Route directly — our server-side API proxy automatically resolves missing tokens and handles retries!
        router.push(`/artist?link=${encodeURIComponent(cleaned)}`)
      } else {
        const resolveToast = toast.loading(`Loading artist "${name}"...`)
        try {
          const res = await fetch(`/api/search?query=${encodeURIComponent(name)}`)
          if (!res.ok) throw new Error()
          const json = await res.json()
          
          const matchedArtist = json?.artists?.[0]
          const resolvedLink = matchedArtist?.link || matchedArtist?.url
          
          if (resolvedLink) {
            toast.dismiss(resolveToast)
            router.push(`/artist?link=${encodeURIComponent(resolvedLink)}`)
          } else {
            throw new Error()
          }
        } catch {
          toast.dismiss(resolveToast)
          // Fallback to general search query if resolution fails
          router.push(`/search?query=${encodeURIComponent(name)}`)
        }
      }
    } else if (type === "channel") {
      router.push(`/search?query=${encodeURIComponent(name)}`)
    } else if (type === "show") {
      router.push(`/jiosaavn-playlist?id=${id}`)
    }
  }

  const isCircular = type === "artist" || type === "artist_recos"
  const placeholderGradient = "bg-gradient-to-br from-[#6C63FF]/30 to-[#FF6584]/20"

  return (
    <div
      onClick={handleCardClick}
      className="playlist-card w-[130px] md:w-[160px] bg-[#181818] hover:bg-[#282828] p-3 md:p-4 space-y-3 cursor-pointer transition-all duration-200 rounded-xl hover:-translate-y-1 hover:shadow-lg snap-start flex-shrink-0 text-left block font-normal group"
    >
      {/* Aspect-square image container matching original exactly */}
      <div
        className={`relative aspect-square w-full overflow-hidden bg-[#282828] shadow-xl ${
          isCircular ? "rounded-full" : "rounded-lg"
        }`}
      >
        {image && !imgFailed ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 768px) 130px, 160px"
            className={`object-cover ${isCircular ? "rounded-full" : "rounded-lg"}`}
            onError={() => setImgFailed(true)}
            unoptimized={true}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${placeholderGradient}`}>
            {isCircular ? (
              <Disc size={36} className="text-[#FF6584] opacity-80" />
            ) : (
              <Disc size={36} className="text-[#6C63FF] opacity-80" />
            )}
          </div>
        )}

        {/* Hover play button slide-up glass overlay matching original */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
          <div className="w-10 h-10 bg-[#6C63FF] rounded-full flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95">
            {isCurrentPlaying ? (
              <Pause size={16} className="fill-white text-white" />
            ) : type === "radio_station" ? (
              <RadioReceiver size={16} className="text-white" />
            ) : (
              <Play size={16} className="fill-white ml-0.5 text-white" />
            )}
          </div>
        </div>

        {/* Equalizer overlay on cover art */}
        {isCurrentPlaying && (
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5 h-4 z-10 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            <span className="w-0.5 bg-[#FF6584] rounded-full animate-bounce h-2" style={{ animationDelay: "0s", animationDuration: "0.6s" }} />
            <span className="w-0.5 bg-[#FF6584] rounded-full animate-bounce h-3" style={{ animationDelay: "0.15s", animationDuration: "0.6s" }} />
            <span className="w-0.5 bg-[#FF6584] rounded-full animate-bounce h-2.5" style={{ animationDelay: "0.3s", animationDuration: "0.6s" }} />
          </div>
        )}
      </div>

      {/* Text Details matching original RowSection exactly */}
      <div className="min-w-0">
        <p
          className={`text-xs md:text-sm font-semibold truncate ${
            isCurrentSong ? "text-[#FF6584]" : "text-white"
          }`}
          title={name}
        >
          {name}
        </p>
        <p
          className="text-[10px] md:text-xs text-[#B3B3B3] truncate mt-0.5"
          title={subtitle}
        >
          {subtitle || (type === "radio_station" ? "Station" : "JioSaavn Mix")}
        </p>
      </div>
    </div>
  )
}
