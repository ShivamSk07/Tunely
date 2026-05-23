"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { ChevronLeft, ChevronRight, LogOut, Bell } from "lucide-react"
import { usePlayerStore } from "@/store/usePlayerStore"
import Logo from "@/components/Logo"
import Link from "next/link"

export default function Navbar() {
  const router = useRouter()
  const { data: session } = useSession()
  const setAuthModalOpen = usePlayerStore((state) => state.setAuthModalOpen)

  const handleAuthClick = () => {
    if (session) signOut({ callbackUrl: "/" })
    else setAuthModalOpen(true)
  }

  return (
    <header className="sticky top-0 right-0 z-20 h-16 flex items-center justify-between px-4 md:px-6 select-none"
      style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile Logo & Brand (shown on mobile, hidden on md where Sidebar handles it) */}
        <Link href="/" className="md:hidden flex items-center gap-2">
          <Logo size={24} />
          <span className="text-lg font-black tracking-tight text-white">Tunely</span>
        </Link>

        {/* Back/Forward navigation (hidden on very small screens to save space if needed, but we'll keep them) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-[#B3B3B3] hover:text-white transition-all hover:bg-black/80"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => router.forward()}
            className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-[#B3B3B3] hover:text-white transition-all hover:bg-black/80"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Right: Auth */}
      <div className="flex items-center gap-2 sm:gap-3">
        {session?.user ? (
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-[#282828] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors">
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-2 bg-[#282828] p-1 rounded-full border border-white/5">
              <img
                src={session.user.image || "https://lh3.googleusercontent.com/a/default-user"}
                alt={session.user.name || "User"}
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-sm font-semibold text-white hidden md:inline pr-2">
                {session.user.name?.split(" ")[0]}
              </span>
            </div>
            <button
              onClick={handleAuthClick}
              className="w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center transition-all active:scale-95 shadow-md shadow-red-500/5"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={handleAuthClick}
              className="hidden sm:block text-sm font-bold text-[#B3B3B3] hover:text-white transition-colors px-4 py-2"
            >
              Sign up
            </button>
            <button
              onClick={handleAuthClick}
              className="text-xs sm:text-sm font-black bg-white text-black px-4 sm:px-6 py-2 rounded-full hover:scale-105 transition-all shadow-md"
            >
              Log in
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
