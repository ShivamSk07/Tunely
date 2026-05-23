"use client"

import React, { useState } from "react"
import { 
  Timer, Sliders, Wind
} from "lucide-react"
import { usePlayerStore } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

// ─── SLEEP TIMER ─────────────────────────────────────────────
export function SleepTimer({}: { onClose?: () => void }) {
  const selected = usePlayerStore((state) => state.sleepTimerSelected)
  const remaining = usePlayerStore((state) => state.sleepTimerRemaining)
  const setSleepTimer = usePlayerStore((state) => state.setSleepTimer)

  const options = [5, 10, 15, 30, 45, 60, 90]

  const startTimer = (minutes: number) => {
    setSleepTimer(minutes)
    toast.success(`Sleep timer set: ${minutes} min`)
  }

  const cancelTimer = () => {
    setSleepTimer(null)
    toast("Sleep timer cancelled")
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#6C63FF22] flex items-center justify-center">
          <Timer size={20} className="text-[#6C63FF]" />
        </div>
        <div>
          <h3 className="font-bold text-white">Sleep Timer</h3>
          <p className="text-xs text-[#B3B3B3]">Automatically stop playback after a set time</p>
        </div>
      </div>

      {remaining !== null && (
        <div className="bg-[#6C63FF11] border border-[#6C63FF33] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#B3B3B3]">Stopping in</p>
            <p className="text-2xl font-black text-[#6C63FF] tabular-nums">{fmt(remaining)}</p>
          </div>
          <button onClick={cancelTimer} className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-500/30 transition-colors">
            Cancel
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {options.map((m) => (
          <button
            key={m}
            onClick={() => startTimer(m)}
            className={`py-3 rounded-xl text-sm font-bold transition-all ${
              selected === m
                ? "bg-[#6C63FF] text-white"
                : "bg-[#282828] text-[#B3B3B3] hover:bg-[#3e3e3e] hover:text-white"
            }`}
          >
            {m}m
          </button>
        ))}
        <button
          onClick={() => startTimer(120)}
          className={`py-3 rounded-xl text-sm font-bold transition-all ${
            selected === 120
              ? "bg-[#6C63FF] text-white"
              : "bg-[#282828] text-[#B3B3B3] hover:bg-[#3e3e3e] hover:text-white"
          }`}
        >
          2h
        </button>
      </div>
    </div>
  )
}

// ─── CROSSFADE ───────────────────────────────────────────────
export function CrossfadeSettings() {
  const [crossfade, setCrossfade] = useState(() => {
    if (typeof window !== "undefined") return parseInt(localStorage.getItem("tunely-crossfade") || "0")
    return 0
  })

  const handleChange = (val: number) => {
    setCrossfade(val)
    localStorage.setItem("tunely-crossfade", String(val))
    toast.success(val === 0 ? "Crossfade disabled" : `Crossfade: ${val}s`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#FF658422] flex items-center justify-center">
          <Wind size={20} className="text-[#FF6584]" />
        </div>
        <div>
          <h3 className="font-bold text-white">Crossfade</h3>
          <p className="text-xs text-[#B3B3B3]">Smoothly blend tracks together</p>
        </div>
      </div>

      <div className="bg-[#1a1a24] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#B3B3B3]">Duration</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {crossfade === 0 ? "Off" : `${crossfade}s`}
          </span>
        </div>
        <div className="relative">
          <div className="w-full h-1.5 bg-[#282828] rounded-full">
            <div
              className="h-full bg-[#FF6584] rounded-full transition-all"
              style={{ width: `${(crossfade / 12) * 100}%` }}
            />
          </div>
          <input
            type="range" min={0} max={12} step={1}
            value={crossfade}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-xs text-[#727272]">
          <span>Off</span>
          <span>12s</span>
        </div>
      </div>

      <p className="text-xs text-[#727272]">
        When enabled, the next track starts playing before the current one ends, creating a seamless listening experience.
      </p>
    </div>
  )
}

// ─── EQUALIZER ────────────────────────────────────────────────
const EQ_BANDS = [
  { label: "60Hz", key: "sub" },
  { label: "250Hz", key: "bass" },
  { label: "1kHz", key: "mid" },
  { label: "4kHz", key: "presence" },
  { label: "16kHz", key: "treble" },
]
const PRESETS: Record<string, Record<string, number>> = {
  Flat:    { sub: 0, bass: 0, mid: 0, presence: 0, treble: 0 },
  Bass:    { sub: 8, bass: 6, mid: 0, presence: -2, treble: -3 },
  Treble:  { sub: -2, bass: -1, mid: 2, presence: 5, treble: 8 },
  Pop:     { sub: 1, bass: 3, mid: 2, presence: 1, treble: 2 },
  Rock:    { sub: 4, bass: 3, mid: -1, presence: 2, treble: 3 },
  Classical: { sub: 0, bass: 1, mid: -1, presence: 2, treble: 3 },
  Podcast: { sub: -3, bass: -1, mid: 4, presence: 3, treble: 1 },
}

export function EqualizerSettings() {
  const eqBands = usePlayerStore((state) => state.eqBands)
  const setEqBands = usePlayerStore((state) => state.setEqBands)
  const [preset, setPreset] = useState("Flat")

  const handleBand = (key: string, val: number) => {
    const next = { ...eqBands, [key]: val }
    setEqBands(next)
    localStorage.setItem("tunely-eq", JSON.stringify(next))
    setPreset("Custom")
  }

  const applyPreset = (name: string) => {
    const next = PRESETS[name]
    setEqBands(next)
    localStorage.setItem("tunely-eq", JSON.stringify(next))
    setPreset(name)
    toast.success(`EQ preset: ${name}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1DB95422] flex items-center justify-center">
          <Sliders size={20} className="text-[#1DB954]" />
        </div>
        <div>
          <h3 className="font-bold text-white">Equalizer</h3>
          <p className="text-xs text-[#B3B3B3]">Fine-tune your audio frequency</p>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((p) => (
          <button
            key={p}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              preset === p ? "bg-[#1DB954] text-black" : "bg-[#282828] text-[#B3B3B3] hover:bg-[#3e3e3e] hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Band sliders */}
      <div className="bg-[#1a1a24] rounded-xl p-4">
        <div className="flex items-end gap-3 h-40 justify-around">
          {EQ_BANDS.map(({ label, key }) => (
            <div key={key} className="flex flex-col items-center gap-2 flex-1">
              <span className={`text-xs font-bold tabular-nums ${eqBands[key] > 0 ? "text-[#1DB954]" : eqBands[key] < 0 ? "text-[#FF6584]" : "text-[#B3B3B3]"}`}>
                {eqBands[key] > 0 ? "+" : ""}{eqBands[key]}
              </span>
              <div className="relative flex-1 flex items-center justify-center" style={{ height: "80px" }}>
                <input
                  type="range" min={-12} max={12} step={1}
                  value={eqBands[key] ?? 0}
                  onChange={(e) => handleBand(key, Number(e.target.value))}
                  className="appearance-none cursor-pointer"
                  style={{
                    writingMode: "vertical-lr",
                    direction: "rtl",
                    width: "24px",
                    height: "80px",
                    accentColor: "#1DB954",
                  }}
                />
              </div>
              <span className="text-[10px] text-[#727272] text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-[#727272]">Note: EQ settings are saved and applied instantly via the Web Audio API.</p>
    </div>
  )
}
