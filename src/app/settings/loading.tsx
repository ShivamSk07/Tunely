import React from "react"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center pb-36 md:pb-12 text-[#B3B3B3]">
      <Loader2 size={32} className="animate-spin text-[#6C63FF] mb-4" />
      <p className="text-sm font-semibold animate-pulse">Loading settings...</p>
    </div>
  )
}
