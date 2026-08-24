"use client"

import React from "react"
import { Song, usePlayerStore } from "@/store/usePlayerStore"
import { X, Play, Music, Trash2 } from "lucide-react"

export default function QueuePanel() {
  const queue = usePlayerStore((state) => state.queue)
  const currentIndex = usePlayerStore((state) => state.currentIndex)
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen)
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen)
  const setCurrentSong = usePlayerStore((state) => state.setCurrentSong)
  const setQueue = usePlayerStore((state) => state.setQueue)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const pause = usePlayerStore((state) => state.pause)
  const play = usePlayerStore((state) => state.play)

  if (!isQueueOpen) return null

  const handleClearQueue = () => {
    setQueue([])
    setQueueOpen(false)
  }

  const handleQueueItemClick = (song: Song, index: number) => {
    if (index === currentIndex) {
      if (isPlaying) {
        pause()
      } else {
        play()
      }
    } else {
      setCurrentSong(song)
    }
  }

  return (
    <>
      {/* ── DESKTOP: Slide-in right sidebar ── */}
      <div className="hidden md:flex fixed top-16 right-0 bottom-[84px] z-20 w-80 bg-[#12121E]/95 border-l border-[#6C63FF1a] backdrop-blur-xl flex-col shadow-2xl select-none animate-in slide-in-from-right duration-300">
        {/* Title */}
        <div className="p-4 border-b border-gray-900/40 flex items-center justify-between">
          <h4 className="text-md font-bold text-white flex items-center gap-2">
            <Music size={16} className="text-[#6C63FF]" />
            Play Queue
          </h4>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button 
                onClick={handleClearQueue}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-red-400 rounded transition-all text-xs flex items-center gap-1 font-semibold"
                title="Clear Queue"
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
            <button 
              onClick={() => setQueueOpen(false)}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Queue list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <QueueList
            queue={queue}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            onItemClick={handleQueueItemClick}
          />
        </div>
      </div>

      {/* ── MOBILE: Full-screen bottom sheet ── */}
      <div
        className="md:hidden fixed inset-0 z-[80] flex flex-col justify-end"
        onClick={() => setQueueOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Sheet */}
        <div
          className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300"
          style={{
            background: "rgba(18,18,30,0.98)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(108,99,255,0.13)",
            maxHeight: "80vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Music size={16} className="text-[#6C63FF]" />
              Play Queue
              <span className="text-xs text-white/40 font-normal ml-1">({queue.length} songs)</span>
            </h4>
            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                >
                  <Trash2 size={13} />
                  Clear
                </button>
              )}
              <button
                onClick={() => setQueueOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Queue items */}
          <div
            className="flex-1 overflow-y-auto p-3 space-y-1"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            <QueueList
              queue={queue}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              onItemClick={handleQueueItemClick}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function QueueList({
  queue,
  currentIndex,
  isPlaying,
  onItemClick,
}: {
  queue: Song[]
  currentIndex: number
  isPlaying: boolean
  onItemClick: (song: Song, idx: number) => void
}) {
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-gray-500">
        <Music size={32} className="text-gray-700" />
        <p className="text-sm font-semibold">Queue is empty</p>
        <p className="text-xs max-w-[200px]">Select a song or album from Discover to start listening!</p>
      </div>
    )
  }

  return (
    <>
      {queue.map((song, idx) => {
        const isCurrent = idx === currentIndex
        return (
          <div
            key={`${song.id}-${idx}`}
            onClick={() => onItemClick(song, idx)}
            className={`group flex items-center gap-3 p-2 rounded-xl transition duration-150 cursor-pointer border ${
              isCurrent
                ? "bg-white/[0.08] border-white/20 shadow-sm"
                : "hover:bg-white/[0.04] border-transparent"
            }`}
            style={{ minHeight: "50px" }}
          >
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#161722] border border-white/[0.06] flex-shrink-0 flex items-center justify-center">
              {song.image ? (
                <img src={song.image} alt={song.name} className="w-full h-full object-cover" />
              ) : (
                <Music size={14} className="text-white/30" />
              )}
              {isCurrent && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play size={12} className="text-white fill-white" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-grow">
              <p className={`text-xs font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-white/90"}`}>
                {song.name}
              </p>
              <p className="text-[10px] text-white/50 truncate">
                {song.artist}
              </p>
            </div>
          </div>
        )
      })}
    </>
  )
}
