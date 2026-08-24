"use client"

import React, { useState, useEffect } from "react"
import { useJamStore } from "@/store/useJamStore"
import { usePlayerStore } from "@/store/usePlayerStore"
import { jamManager } from "@/lib/jamManager"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import { 
  X, Radio, Users, Copy, Check, QrCode, LogOut, 
  Sparkles, Loader2, Play, Volume2, ArrowRight
} from "lucide-react"

export default function JamModal() {
  const { data: session } = useSession()
  const {
    isJamModalOpen,
    setJamModalOpen,
    isInJam,
    isHost,
    roomId,
    members,
    connectionStatus,
    errorMessage,
  } = useJamStore()

  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)

  const [tab, setTab] = useState<"host" | "join">("host")
  const [userName, setUserName] = useState("")
  const [joinCodeInput, setJoinCodeInput] = useState("")
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session?.user?.name && !userName) {
      setUserName(session.user.name.split(" ")[0])
    }
  }, [session, userName])

  if (!isJamModalOpen) return null

  const handleStartHost = async () => {
    setIsSubmitting(true)
    try {
      const name = userName.trim() || "Host"
      await jamManager.createRoom(name)
      toast.success("Tunely Jam is live! Share your invite link.")
    } catch (err: any) {
      toast.error(err?.message || "Could not start Jam session")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCodeInput.trim()
    if (!code) {
      toast.error("Please enter a room code")
      return
    }

    const formattedCode = code.startsWith("tunely-") ? code : `tunely-${code}`
    setIsSubmitting(true)
    try {
      const name = userName.trim() || "Listener"
      await jamManager.joinRoom(formattedCode, name)
      toast.success("Connected to Jam session!")
    } catch (err: any) {
      toast.error("Could not join Jam. Check room code.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = () => {
    if (!roomId) return
    const inviteUrl = `${window.location.origin}/?jam=${roomId}`
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    toast.success("Invite link copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = () => {
    jamManager.leave()
    toast.success("Left Jam session")
  }

  const shareUrl = roomId ? `${typeof window !== "undefined" ? window.location.origin : ""}/?jam=${roomId}` : ""
  const qrUrl = roomId ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=18-19-28&color=255-255-255&margin=6` : ""

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#12131c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Radio size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Tunely Jam
                {isInJam && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white border border-white/10 uppercase tracking-widest">
                    {isHost ? "Host" : "Listener"}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-white/40">Real-time synchronized music with friends</p>
            </div>
          </div>
          <button
            onClick={() => setJamModalOpen(false)}
            className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {isInJam ? (
            /* ── ACTIVE JAM SESSION VIEW ── */
            <div className="space-y-4">
              {/* Room Code & Copy Card */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Room Code</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-400">Live Sync</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl font-black tracking-widest text-white font-mono">
                    {roomId?.replace("tunely-", "")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowQR(!showQR)}
                      className={`p-2 rounded-lg border transition-all ${
                        showQR ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                      title="Show QR Code"
                    >
                      <QrCode size={16} />
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied" : "Copy Link"}
                    </button>
                  </div>
                </div>

                {/* QR Code Popup dropdown */}
                {showQR && qrUrl && (
                  <div className="pt-3 border-t border-white/5 flex flex-col items-center gap-2 animate-fade-in">
                    <div className="p-2 rounded-xl bg-[#181924] border border-white/10 shadow-lg">
                      <img src={qrUrl} alt="Jam Room QR Code" className="w-40 h-40 rounded-lg" />
                    </div>
                    <span className="text-[10px] text-white/40">Scan with mobile camera to join</span>
                  </div>
                )}
              </div>

              {/* Now Playing in Jam */}
              {currentSong && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <img
                    src={currentSong.image}
                    alt={currentSong.name}
                    className="w-10 h-10 rounded-lg object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">{currentSong.name}</p>
                      {isPlaying && (
                        <div className="eq-container">
                          <span className="eq-bar-1" /><span className="eq-bar-2" /><span className="eq-bar-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-white/50 truncate">{currentSong.artist}</p>
                  </div>
                </div>
              )}

              {/* Connected Listeners List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-white/50 font-semibold px-1">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} /> Listeners ({members.length || 1})
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">
                    {isHost ? "You are Host" : "Synced to Host"}
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 [scrollbar-width:thin]">
                  {members.map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-white">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white/90 truncate max-w-[180px]">
                          {member.name}
                        </span>
                      </div>
                      {member.isHost ? (
                        <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">
                          Host
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Synced
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave / End button */}
              <button
                onClick={handleLeave}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all active:scale-98 mt-2"
              >
                <LogOut size={14} /> {isHost ? "End Jam for Everyone" : "Leave Jam Session"}
              </button>
            </div>
          ) : (
            /* ── START / JOIN TABS VIEW ── */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/5 text-xs font-semibold">
                <button
                  onClick={() => setTab("host")}
                  className={`py-2 rounded-lg transition-all ${
                    tab === "host" ? "bg-white text-black shadow-md font-bold" : "text-white/60 hover:text-white"
                  }`}
                >
                  Host Session
                </button>
                <button
                  onClick={() => setTab("join")}
                  className={`py-2 rounded-lg transition-all ${
                    tab === "join" ? "bg-white text-black shadow-md font-bold" : "text-white/60 hover:text-white"
                  }`}
                >
                  Join Session
                </button>
              </div>

              {/* User Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Your Display Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Shivam"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {tab === "host" ? (
                /* Host View */
                <div className="space-y-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/60 space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-white/90">How Hosting Works:</p>
                    <p>Start a session and share your link. Your friends will hear the exact same song, synchronized to the millisecond with your play, pause, and track changes.</p>
                  </div>

                  <button
                    onClick={handleStartHost}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-bold hover:scale-[1.02] active:scale-98 transition-all shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Creating Jam Room...
                      </>
                    ) : (
                      <>
                        <Radio size={16} /> Start Live Jam
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Join View */
                <form onSubmit={handleJoin} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Room Code</label>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 4821 or tunely-4821"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono tracking-wider placeholder:text-white/30 placeholder:font-sans focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !joinCodeInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-bold hover:scale-[1.02] active:scale-98 transition-all shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Connecting to Host...
                      </>
                    ) : (
                      <>
                        Join Jam <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {errorMessage && (
                <p className="text-xs text-red-400 text-center font-medium">{errorMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
