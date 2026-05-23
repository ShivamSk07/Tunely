"use client"

import React, { useState } from "react"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { 
  Timer, Wind, Sliders, X, Wifi, WifiOff,
  Music2, ChevronRight, LogOut, Smartphone
} from "lucide-react"
import { SleepTimer, CrossfadeSettings, EqualizerSettings } from "@/components/SettingsPanels"
import { usePlayerStore } from "@/store/usePlayerStore"

type Panel = "home" | "sleep" | "crossfade" | "eq" | "offline" | "quality" | "install" | "about"

export default function SettingsPage() {
  const { data: session } = useSession()
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)
  const streamQuality = usePlayerStore((state) => state.streamQuality)
  const [activePanel, setActivePanel] = useState<Panel>("home")

  const settings = [
    {
      icon: Timer,
      label: "Sleep Timer",
      desc: "Auto-stop after a set time",
      panel: "sleep" as Panel,
      color: "#6C63FF",
      bg: "#6C63FF22",
    },
    {
      icon: Wind,
      label: "Crossfade",
      desc: "Smooth transitions between songs",
      panel: "crossfade" as Panel,
      color: "#FF6584",
      bg: "#FF658422",
    },
    {
      icon: Sliders,
      label: "Equalizer",
      desc: "Customize bass, treble & more",
      panel: "eq" as Panel,
      color: "#1DB954",
      bg: "#1DB95422",
    },
    {
      icon: Wifi,
      label: "Stream Quality",
      desc: "Adjust audio quality parameters",
      panel: "quality" as Panel,
      color: "#10B981",
      bg: "#10B98122",
    },
    {
      icon: WifiOff,
      label: "Offline Mode",
      desc: "Cache songs for offline playback",
      panel: "offline" as Panel,
      color: "#F59E0B",
      bg: "#F59E0B22",
    },
    {
      icon: Smartphone,
      label: "Install App",
      desc: "Install Tunely on your device",
      panel: "install" as Panel,
      color: "#3B82F6",
      bg: "#3B82F622",
    },
  ]

  return (
    <div className="min-h-full px-4 md:px-6 py-8 pb-36 md:pb-12 bg-gradient-to-b from-[#111118] to-[#0a0a0f]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          {activePanel !== "home" && (
            <button
              onClick={() => setActivePanel("home")}
              className="w-9 h-9 rounded-full bg-[#282828] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-white">Settings</h1>
            {activePanel !== "home" && (
              <p className="text-sm text-[#B3B3B3] mt-0.5">
                {settings.find(s => s.panel === activePanel)?.label || "Settings"}
              </p>
            )}
          </div>
        </div>

        {/* Home panel */}
        {activePanel === "home" && (
          <div className="space-y-6">
            {/* Account Card Section */}
            <div className="p-5 bg-[#181818] border border-white/5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {session?.user ? (
                <>
                  <div className="flex items-center gap-4">
                    <Image
                      src={session.user.image || "https://lh3.googleusercontent.com/a/default-user"}
                      alt={session.user.name || "User"}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full border border-white/10 shadow"
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 leading-none">
                        {session.user.name} <span className="text-[9px] font-black text-[#6C63FF] bg-[#6C63FF]/15 px-2 py-0.5 rounded-full border border-[#6C63FF22] uppercase tracking-widest">Active</span>
                      </h3>
                      <p className="text-xs text-[#B3B3B3] mt-2 font-medium">{session.user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition duration-200 active:scale-[0.98]"
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Music2 size={20} className="text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white leading-none">An anonymous guest</h3>
                      <p className="text-xs text-[#B3B3B3] mt-2 font-medium">Log in to sync playlists, recent plays and likes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-5 py-2 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white font-bold text-xs rounded-xl hover:opacity-95 transition duration-200 active:scale-[0.98] shadow-md shadow-[#6C63FF22]"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* Playback section */}
            <div>
              <h2 className="text-xs font-bold text-[#B3B3B3] uppercase tracking-widest px-1 mb-3">Playback</h2>
            {settings.map(({ icon: Icon, label, desc, panel, color, bg }) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className="w-full flex items-center gap-4 p-4 bg-[#181818] hover:bg-[#282828] rounded-xl transition-colors group text-left"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{label}</p>
                  <p className="text-sm text-[#B3B3B3]">{desc}</p>
                </div>
                <ChevronRight size={18} className="text-[#727272] group-hover:text-white transition-colors flex-shrink-0" />
              </button>
            ))}
            </div>

            {/* Account section */}
            <h2 className="text-xs font-bold text-[#B3B3B3] uppercase tracking-widest px-1 mt-6 mb-2">App Info</h2>
            <div className="p-4 bg-[#181818] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#B3B3B3]">Developer</span>
                <span className="text-sm font-semibold text-[#6C63FF]">Shivam Kothekar</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#B3B3B3]">Version</span>
                <span className="text-sm font-semibold text-white">Tunely v1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#B3B3B3]">Audio Quality</span>
                <span className="text-sm font-semibold text-[#1DB954] uppercase">{streamQuality}</span>
              </div>

            </div>
          </div>
        )}

        {/* Sub-panels */}
        {activePanel === "sleep" && (
          <div className="bg-[#181818] rounded-2xl p-6">
            <SleepTimer onClose={() => setActivePanel("home")} />
          </div>
        )}

        {activePanel === "crossfade" && (
          <div className="bg-[#181818] rounded-2xl p-6">
            <CrossfadeSettings />
          </div>
        )}

        {activePanel === "eq" && (
          <div className="bg-[#181818] rounded-2xl p-6">
            <EqualizerSettings />
          </div>
        )}

        {activePanel === "offline" && (
          <div className="bg-[#181818] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B22] flex items-center justify-center">
                <WifiOff size={20} className="text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="font-bold text-white">Offline Mode</h3>
                <p className="text-xs text-[#B3B3B3]">Cache songs for offline playback</p>
              </div>
            </div>
            <div className="bg-[#1a1a24] rounded-xl p-4 space-y-3">
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                {"Tunely uses your browser's Cache storage system to store recently played songs locally. When you lose internet connection, cached tracks will still be available."}
              </p>
              <div className="flex items-center gap-2 text-sm text-[#F59E0B] font-medium">
                <Wifi size={16} />
                Cache is managed automatically — recently played songs are cached as you listen.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  try {
                    const keys = await caches.keys()
                    const tunelyCaches = keys.filter(k => k.startsWith("tunely-"))
                    let totalBytes = 0
                    for (const key of tunelyCaches) {
                      const cache = await caches.open(key)
                      const requests = await cache.keys()
                      totalBytes += requests.length * 3_200_000 // est 3.2MB per song
                    }
                    const mb = (totalBytes / 1_000_000).toFixed(1)
                    alert(`Estimated cache: ~${mb}MB\n(${tunelyCaches.length} cache(s))`)
                  } catch {
                    alert("Cache storage not available in this browser")
                  }
                }}
                className="py-3 bg-[#282828] text-white text-sm font-semibold rounded-xl hover:bg-[#3e3e3e] transition-colors"
              >
                Check Cache
              </button>
              <button
                onClick={async () => {
                  try {
                    const keys = await caches.keys()
                    for (const key of keys.filter(k => k.startsWith("tunely-"))) await caches.delete(key)
                    alert("Cache cleared successfully!")
                  } catch {
                    alert("Could not clear cache")
                  }
                }}
                className="py-3 bg-red-500/20 text-red-400 text-sm font-semibold rounded-xl hover:bg-red-500/30 transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>
        )}

        {activePanel === "quality" && (
          <div className="bg-[#181818] rounded-2xl p-6">
            <QualitySettings />
          </div>
        )}

        {activePanel === "install" && (
          <div className="bg-[#181818] rounded-2xl p-6">
            <InstallAppPanel />
          </div>
        )}
      </div>
    </div>
  )
}

function InstallAppPanel() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  React.useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true)
    }

    // Check if iOS
    const ua = window.navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIsIOS(ios)

    // Android/Chrome install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else if (isIOS) {
      alert('To install on iOS: Tap the Share button at the bottom of the screen, then tap "Add to Home Screen".')
    } else {
      alert('App is either already installed, or your browser does not support automatic installation. Try "Add to Home screen" from your browser menu.')
    }
  }

  if (isStandalone) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#10B98122] mx-auto flex items-center justify-center">
          <Smartphone size={32} className="text-[#10B981]" />
        </div>
        <h3 className="font-bold text-white text-lg">App is Installed!</h3>
        <p className="text-sm text-[#B3B3B3]">You are currently using the installed version of Tunely.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#3B82F622] flex items-center justify-center">
          <Smartphone size={20} className="text-[#3B82F6]" />
        </div>
        <div>
          <h3 className="font-bold text-white">Install Tunely</h3>
          <p className="text-xs text-[#B3B3B3]">Get the full native app experience</p>
        </div>
      </div>

      <div className="bg-[#1a1a24] rounded-xl p-4 space-y-3">
        <p className="text-sm text-[#B3B3B3] leading-relaxed">
          Install Tunely on your home screen for quick access, full-screen playback, and a better native app experience without using app store space.
        </p>
      </div>

      <button
        onClick={handleInstallClick}
        className="w-full py-3.5 bg-[#3B82F6] text-white font-bold rounded-xl shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] transition-colors"
      >
        {isIOS ? "How to Install on iOS" : "Install App Now"}
      </button>
    </div>
  )
}

function QualitySettings() {
  const streamQuality = usePlayerStore((state) => state.streamQuality)
  const setStreamQuality = usePlayerStore((state) => state.setStreamQuality)

  const qualities = [
    { value: "320kbps", label: "320 kbps (Extreme)", desc: "Best audio fidelity, uses more data. Crystal clear HD audio." },
    { value: "160kbps", label: "160 kbps (High)", desc: "Excellent balance of clarity and data consumption." },
    { value: "96kbps", label: "96 kbps (Medium)", desc: "Standard quality. Ideal for weak cellular networks." },
    { value: "48kbps", label: "48 kbps (Low)", desc: "Saves a lot of data. Intended for strict data caps." },
    { value: "12kbps", label: "12 kbps (Saver)", desc: "Ultra-low bitrate. Works on virtually any connection." },
  ] as const

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#10B98122] flex items-center justify-center">
          <Wifi size={20} className="text-[#10B981]" />
        </div>
        <div>
          <h3 className="font-bold text-white">Stream Quality</h3>
          <p className="text-xs text-[#B3B3B3]">Set your preferred streaming bitrate</p>
        </div>
      </div>

      <div className="bg-[#1a1a24] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-sm text-[#B3B3B3]">Current Setting</span>
          <span className="text-sm font-black text-[#10B981] uppercase tracking-wide bg-[#10B981]/15 px-2 py-0.5 rounded-md border border-[#10B98122]">
            {streamQuality}
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {qualities.map((q) => (
            <button
              key={q.value}
              onClick={() => setStreamQuality(q.value)}
              className={`w-full flex items-start gap-4 p-3 rounded-xl transition-all border text-left ${
                streamQuality === q.value
                  ? "bg-[#10B981]/10 border-[#10B981]/30"
                  : "bg-white/5 border-transparent hover:bg-white/10"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                streamQuality === q.value ? "border-[#10B981]" : "border-white/20"
              }`}>
                {streamQuality === q.value && <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${streamQuality === q.value ? "text-[#10B981]" : "text-white"}`}>{q.label}</p>
                <p className="text-xs text-[#B3B3B3] mt-1 font-normal leading-relaxed">{q.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-[#727272] leading-relaxed">
        Note: The streaming bitrate will adapt instantly. Tunely applies active caching to store your chosen preferences permanently.
      </p>
    </div>
  )
}
