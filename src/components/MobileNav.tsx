"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Search, UserCircle, BarChart2 } from "lucide-react"
import Logo from "@/components/Logo"

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    router.prefetch("/search")
    router.prefetch("/charts")
    router.prefetch("/settings")
  }, [router])

  const tabs = [
    { label: "Home",     icon: Home,        href: "/" },
    { label: "Search",  icon: Search,      href: "/search" },
    { label: "Charts",  icon: BarChart2,   href: "/charts" },
    { label: "Profile", icon: UserCircle,  href: "/settings" },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Developer Credit strip — above the nav tabs */}
      <div
        className="w-full flex items-center justify-center gap-1.5 py-1 border-t border-white/5"
        style={{ background: "rgba(8,8,16,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        <Logo size={10} />
        <span className="text-[9px] text-white/25 tracking-widest font-medium select-none">
          Developed by <span className="text-white/40 font-semibold">Shivam Kothekar</span>
        </span>
      </div>

      {/* Nav Tab Bar */}
      <nav
        className="w-full flex justify-around items-center"
        style={{
          height: "56px",
          background: "rgba(8,8,16,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-[3px] flex-1 h-full relative group"
            >
              {/* Active indicator pill at top */}
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full transition-all duration-300"
                style={{
                  width: isActive ? "20px" : "0px",
                  background: "linear-gradient(90deg, #6C63FF, #FF6584)",
                }}
              />

              {/* Icon */}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.38)" }}
                className="transition-all duration-200 group-active:scale-90"
              />

              {/* Label */}
              <span
                className="text-[9px] font-semibold tracking-wide transition-all duration-200"
                style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
