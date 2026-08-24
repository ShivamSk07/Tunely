"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SectionRowProps {
  title: string
  children: React.ReactNode
  seeAllHref?: string
}

export default function SectionRow({ title, children, seeAllHref }: SectionRowProps) {
  const router = useRouter()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = React.useState(false)
  const [showRightArrow, setShowRightArrow] = React.useState(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 10)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const offset = direction === "left" ? -400 : 400
    el.scrollBy({ left: offset, behavior: "smooth" })
  }

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) {
      handleScroll()
      el.addEventListener("scroll", handleScroll)
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  const handleSeeAllClick = () => {
    if (seeAllHref) {
      router.push(seeAllHref)
    }
  }

  return (
    <div className="relative group/row space-y-4 select-none">
      {/* Header Container */}
      <div className="flex items-center justify-between px-4 md:px-6">
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-tight hover:text-white/80 transition-colors cursor-pointer">
          {title}
        </h3>
        
        {/* See All Button */}
        {seeAllHref && (
          <button
            onClick={handleSeeAllClick}
            className="text-[11px] font-semibold text-white/70 hover:text-white uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] rounded-full border border-white/10"
          >
            See All
          </button>
        )}
      </div>

      {/* Horizontal Scroll container with snap */}
      <div className="relative px-4 md:px-6">
        {/* Desktop Left navigation button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center bg-black/80 border border-white/15 hover:bg-white hover:text-black text-white rounded-full shadow-lg backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Desktop Right navigation button */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center bg-black/80 border border-white/15 hover:bg-white hover:text-black text-white rounded-full shadow-lg backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Outer scroll box */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
