import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/providers/AuthProvider"
import QueryProvider from "@/providers/QueryProvider"
import { Toaster } from "react-hot-toast"
import Sidebar from "@/components/Sidebar"
import Navbar from "@/components/Navbar"
import BottomPlayer from "@/components/BottomPlayer"
import AudioPlayer from "@/components/AudioPlayer"
import QueuePanel from "@/components/QueuePanel"
import LyricsPanel from "@/components/LyricsPanel"
import GlobalModalWrapper from "@/components/GlobalModalWrapper"
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar"
import MobileNav from "@/components/MobileNav"
import ExpandedPlayer from "@/components/ExpandedPlayer"
import InitialPageLoader from "@/components/InitialPageLoader"
import KeyboardShortcuts from "@/components/KeyboardShortcuts"
import NextTopLoader from "nextjs-toploader"
import JamModal from "@/components/JamModal"
import JamBanner from "@/components/JamBanner"
import JamUrlListener from "@/components/JamUrlListener"

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Tunely — Stream Music",
  description: "A modern music streaming platform with instant 320kbps playback, curated playlists, liked tracks, and artist discovery.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <AuthProvider>
          <QueryProvider>
            {/* Top Loading Progress Bar */}
            <NextTopLoader
              color="linear-gradient(to right, #6C63FF, #FF6584)"
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl={true}
              showSpinner={false}
              easing="ease"
              speed={200}
              shadow="0 0 10px #6C63FF, 0 0 5px #FF6584"
            />
            {/* Global interactive page splash loader */}
            <InitialPageLoader />

            {/* App shell */}
            <div className="flex h-screen overflow-hidden">
              {/* Fixed left sidebar — hidden on mobile via CSS (md:flex is set inside Sidebar) */}
              <Sidebar />

              {/* Main content — on mobile no left margin, on desktop offset by sidebar */}
              <div className="flex flex-col flex-1 overflow-hidden ml-0 md:ml-[240px]">
                {/* Sticky top navbar */}
                <Navbar />

                {/* Scrollable page content */}
                {/* Mobile: pb = mini-player (64px) + bottom-nav (56px) + safe-area */}
                {/* Desktop: pb = player-height (90px) */}
                <main
                  className="flex-1 overflow-y-auto overflow-x-hidden"
                  style={{
                    paddingBottom: "var(--player-height)",
                  }}
                >
                  {/* Mobile bottom padding override via inline style with CSS custom property */}
                  <style>{`
                    @media (max-width: 768px) {
                      main {
                        padding-bottom: calc(var(--mobile-bottom-clearance) + env(safe-area-inset-bottom, 0px)) !important;
                      }
                    }
                  `}</style>
                  {children}
                </main>
              </div>

              {/* Queue side panel (floats over content — desktop sidebar, mobile bottom sheet) */}
              <QueuePanel />

              {/* Synced & plain live lyrics sidebar panel */}
              <LyricsPanel />
            </div>

            {/* Bottom player bar — desktop only (hidden md:block is set inside BottomPlayer) */}
            {/* On mobile, BottomPlayer renders the mini-player above the nav */}
            <BottomPlayer />

            {/* Mobile bottom navigation bar */}
            <MobileNav />

            {/* Invisible audio bridge */}
            <AudioPlayer />

            {/* Expanded player details popup */}
            <ExpandedPlayer />

            {/* Event-driven modals (auth, add-to-playlist) */}
            <GlobalModalWrapper />

            {/* Tunely Jam modal & floating pill */}
            <JamBanner />
            <JamModal />
            <JamUrlListener />

            {/* Offline PWA Service Worker */}
            <ServiceWorkerRegistrar />

            {/* Global keyboard shortcuts */}
            <KeyboardShortcuts />

            {/* Toast notifications */}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#282828",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  // Push toast above mobile player+nav
                  marginBottom: "140px",
                },
              }}
            />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
