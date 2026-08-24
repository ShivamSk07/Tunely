"use client"

import React from "react"
import { useJamStore } from "@/store/useJamStore"
import { Radio, Users, X } from "lucide-react"

export default function JamBanner() {
  const { isInJam, isHost, roomId, members, setJamModalOpen, leaveJam } = useJamStore()

  if (!isInJam || !roomId) return null

  return (
    <div
      onClick={() => setJamModalOpen(true)}
      className="fixed top-20 right-4 sm:right-6 z-40 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#12131c]/95 border border-white/10 backdrop-blur-xl shadow-2xl cursor-pointer hover:border-white/20 transition-all active:scale-95 select-none"
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <Radio size={13} className="text-white" />
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
        <span>Jam: {roomId.replace("tunely-", "")}</span>
        <span className="text-white/30">•</span>
        <span className="text-white/60 flex items-center gap-1">
          <Users size={11} /> {members.length || 1}
        </span>
      </div>

      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-bold text-white uppercase tracking-wider border border-white/10">
        {isHost ? "Host" : "Synced"}
      </span>
    </div>
  )
}
