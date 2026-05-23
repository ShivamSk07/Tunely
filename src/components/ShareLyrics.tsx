"use client"

import React, { useState, useEffect } from "react"
import { Share2, Copy, Check, ExternalLink, Loader2, Mic } from "lucide-react"
import { usePlayerStore } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────
export function ShareModal({}: { onClose?: () => void }) {
  const currentSong = usePlayerStore((state) => state.currentSong)
  const [copied, setCopied] = useState(false)

  if (!currentSong) return null

  const shareText = `Now Playing: ${currentSong.name} — ${currentSong.artist}\nListening on Tunely`
  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://tunely.app"

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: currentSong.name, text: shareText, url: shareUrl })
      } catch { /* user cancelled */ }
    } else {
      handleCopy()
    }
  }

  const shareOptions = [
    {
      label: "WhatsApp",
      color: "#25D366",
      bg: "#25D36622",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
    },
    {
      label: "Twitter/X",
      color: "#1DA1F2",
      bg: "#1DA1F222",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText}`)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "Telegram",
      color: "#0088cc",
      bg: "#0088cc22",
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Song preview card */}
      <div className="flex items-center gap-4 p-4 bg-[#282828] rounded-xl">
        <img src={currentSong.image} alt={currentSong.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-white truncate">{currentSong.name}</p>
          <p className="text-sm text-[#B3B3B3] truncate">{currentSong.artist}</p>
          <p className="text-xs text-[#6C63FF] mt-0.5 font-medium">320 kbps · Tunely</p>
        </div>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-3 gap-3">
        {shareOptions.map(({ label, color, bg, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
            style={{ background: bg }}
          >
            <ExternalLink size={20} style={{ color }} />
            <span className="text-xs font-semibold text-white">{label}</span>
          </a>
        ))}
      </div>

      {/* Copy link */}
      <div className="flex items-center gap-2 p-3 bg-[#1a1a24] rounded-xl border border-white/5">
        <p className="flex-1 text-xs text-[#B3B3B3] truncate">{shareText}</p>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            copied ? "bg-[#1DB954] text-black" : "bg-[#282828] text-white hover:bg-[#3e3e3e]"
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Native share */}
      <button
        onClick={handleNativeShare}
        className="w-full py-3 bg-[#6C63FF] text-white text-sm font-bold rounded-xl hover:bg-[#574AE2] transition-colors flex items-center justify-center gap-2"
      >
        <Share2 size={16} /> Share via device
      </button>
    </div>
  )
}

// ─── LYRICS PANEL ─────────────────────────────────────────────────────────────
export function LyricsPanel({}: { onClose?: () => void }) {
  const currentSong = usePlayerStore((state) => state.currentSong)
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!currentSong) return
    setLyrics(null)
    setError(false)
    setLoading(true)

    // Try fetching from the lyrics api first (supports full plain & synced lyrics via LRCLIB)
    fetch(`/api/lyrics?songName=${encodeURIComponent(currentSong.name)}&artist=${encodeURIComponent(currentSong.artist)}&lyricsId=${encodeURIComponent(currentSong.id)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.plain) {
          setLyrics(data.plain)
        } else {
          // Fallback to song detail endpoint
          return fetch(`/api/song?id=${encodeURIComponent(currentSong.id)}`)
            .then(r => r.json())
            .then(songData => {
              if (songData?.lyrics?.snippet) {
                setLyrics(songData.lyrics.snippet)
              } else if (songData?.has_lyrics || songData?.hasLyrics) {
                setLyrics("Lyrics are available for this song but could not be loaded.\n\nTry searching for lyrics on Google or Genius.")
              } else {
                setError(true)
              }
            })
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [currentSong])

  if (!currentSong) {
    return (
      <div className="text-center py-12">
        <Mic size={40} className="text-[#727272] mx-auto mb-3" />
        <p className="text-[#B3B3B3]">Play a song to see lyrics</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Now playing */}
      <div className="text-center pb-2">
        <img src={currentSong.image} alt={currentSong.name} className="w-20 h-20 rounded-xl object-cover mx-auto mb-3 shadow-xl" />
        <p className="font-black text-white text-lg">{currentSong.name}</p>
        <p className="text-sm text-[#B3B3B3]">{currentSong.artist}</p>
      </div>

      {/* Lyrics content */}
      <div className="bg-[#181818] rounded-xl p-5 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={28} className="animate-spin text-[#6C63FF]" />
          </div>
        ) : error ? (
          <div className="text-center py-8 space-y-2">
            <Mic size={32} className="text-[#727272] mx-auto" />
            <p className="text-sm text-[#B3B3B3]">No lyrics found for this song</p>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(currentSong.name + " " + currentSong.artist + " lyrics")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#6C63FF] hover:underline mt-2"
            >
              Search on Google <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <pre className="text-sm text-[#E5E7EB] leading-relaxed whitespace-pre-wrap font-sans">
            {lyrics}
          </pre>
        )}
      </div>

      {/* External lyrics link */}
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(currentSong.name + " " + currentSong.artist + " lyrics")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2.5 text-sm text-[#B3B3B3] hover:text-white transition-colors"
      >
        <ExternalLink size={14} />
        Search full lyrics online
      </a>
    </div>
  )
}
