"use client"

import type { Peer as PeerType, DataConnection } from "peerjs"
import { useJamStore } from "@/store/useJamStore"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

export type JamAction =
  | { type: "SYNC_STATE"; song: Song | null; isPlaying: boolean; currentTime: number; timestamp: number }
  | { type: "PLAY"; timestamp: number }
  | { type: "PAUSE"; timestamp: number }
  | { type: "SEEK"; time: number; timestamp: number }
  | { type: "CHANGE_SONG"; song: Song; queue?: Song[]; index?: number; timestamp: number }
  | { type: "MEMBER_INFO"; name: string; id: string }
  | { type: "ROOM_MEMBERS"; members: { id: string; name: string; isHost?: boolean }[] }

class JamManager {
  private peer: PeerType | null = null
  private connections: Map<string, DataConnection> = new Map()
  private hostConnection: DataConnection | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  // Debounce / throttle guards — prevent feedback loops
  private lastBroadcastTime = 0
  private isSyncing = false   // listener flag: ignore player events triggered by sync itself

  // ── HOST: Create Room ─────────────────────────────────────────────────────

  async createRoom(hostName = "Host"): Promise<string> {
    this.leave()

    const { default: Peer } = await import("peerjs")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
    const roomId = `tunely-${randomSuffix}`

    return new Promise((resolve, reject) => {
      useJamStore.getState().setConnectionStatus("connecting")

      const peer = new Peer(roomId, { debug: 0 })

      peer.on("open", (id) => {
        this.peer = peer
        useJamStore.getState().setJamSession({ roomId: id, peerId: id, isHost: true })
        useJamStore.getState().setMembers([{ id, name: hostName, isHost: true }])
        this.startHeartbeat()
        resolve(id)
      })

      peer.on("connection", (conn) => this.handleIncomingAsHost(conn))

      peer.on("error", (err: any) => {
        console.error("Jam Peer error:", err)
        useJamStore.getState().setConnectionStatus("error", err?.message || "Connection failed")
        if (err.type === "unavailable-id") {
          this.createRoom(hostName).then(resolve).catch(reject)
        } else {
          reject(err)
        }
      })
    })
  }

  // ── LISTENER: Join Room ───────────────────────────────────────────────────

  async joinRoom(roomId: string, listenerName = "Listener"): Promise<void> {
    this.leave()
    const cleanRoomId = roomId.trim().toLowerCase()

    const { default: Peer } = await import("peerjs")

    return new Promise((resolve, reject) => {
      useJamStore.getState().setConnectionStatus("connecting")

      const peer = new Peer({ debug: 0 })

      peer.on("open", (myPeerId) => {
        this.peer = peer
        const conn = peer.connect(cleanRoomId, { reliable: true })

        conn.on("open", () => {
          this.hostConnection = conn
          useJamStore.getState().setJamSession({ roomId: cleanRoomId, peerId: myPeerId, isHost: false })

          // Send name to host
          conn.send({ type: "MEMBER_INFO", name: listenerName, id: myPeerId } as JamAction)
          resolve()
        })

        conn.on("data", (data: unknown) => {
          this.handleActionAsListener(data as JamAction)
        })

        conn.on("close", () => {
          toast.error("Host ended the Jam session.")
          this.leave()
        })

        conn.on("error", (err) => {
          console.error("Host conn error:", err)
          useJamStore.getState().setConnectionStatus("error", "Failed to connect to host.")
          reject(err)
        })
      })

      peer.on("error", (err) => {
        console.error("Listener peer error:", err)
        useJamStore.getState().setConnectionStatus("error", "Room not found or unavailable.")
        reject(err)
      })
    })
  }

  // ── HOST: Broadcast — throttled to max 1 per 250ms ───────────────────────

  broadcast(action: JamAction) {
    if (!useJamStore.getState().isHost) return
    if (!this.connections.size) return

    // Throttle: skip if last broadcast was <250ms ago (except CHANGE_SONG)
    const now = Date.now()
    if (action.type !== "CHANGE_SONG" && now - this.lastBroadcastTime < 250) return
    this.lastBroadcastTime = now

    this.connections.forEach((conn) => {
      if (conn.open) {
        try { conn.send(action) } catch (e) { /* ignore */ }
      }
    })
  }

  // ── HOST: Handle incoming listener connection ────────────────────────────

  private handleIncomingAsHost(conn: DataConnection) {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn)

      // Send current state immediately to new joiner
      const ps = usePlayerStore.getState()
      conn.send({
        type: "SYNC_STATE",
        song: ps.currentSong,
        isPlaying: ps.isPlaying,
        currentTime: ps.currentTime,
        timestamp: Date.now(),
      } as JamAction)

      this.broadcastMembersList()
    })

    conn.on("data", (data: unknown) => {
      const action = data as JamAction
      if (action.type === "MEMBER_INFO") {
        useJamStore.getState().addMember({ id: action.id, name: action.name })
        this.broadcastMembersList()
        toast.success(`${action.name} joined the Jam!`)
      }
    })

    conn.on("close", () => {
      this.connections.delete(conn.peer)
      useJamStore.getState().removeMember(conn.peer)
      this.broadcastMembersList()
    })
  }

  private broadcastMembersList() {
    const members = useJamStore.getState().members
    // Send directly without throttle
    this.connections.forEach((conn) => {
      if (conn.open) {
        try { conn.send({ type: "ROOM_MEMBERS", members } as JamAction) } catch (e) { /* ignore */ }
      }
    })
  }

  // ── LISTENER: Apply host action ──────────────────────────────────────────

  private handleActionAsListener(action: JamAction) {
    // Prevent re-broadcasting of events triggered by our own sync
    this.isSyncing = true

    const player = usePlayerStore.getState()

    try {
      switch (action.type) {
        case "SYNC_STATE": {
          if (!action.song) break

          const isSameSong = player.currentSong?.id === action.song.id

          if (!isSameSong) {
            // Load the new song first, then seek
            player.setQueue([action.song], 0)
          }

          // Latency compensation: add network delay to currentTime
          const latencyMs = Date.now() - action.timestamp
          const latencySec = Math.min(latencyMs / 1000, 5) // cap at 5s
          const targetTime = action.currentTime + (action.isPlaying ? latencySec : 0)

          // Only seek if drift > 2s to avoid constant jitter
          const currentAudio = document.querySelector("audio") as HTMLAudioElement | null
          if (currentAudio) {
            const drift = Math.abs(currentAudio.currentTime - targetTime)
            if (drift > 2) {
              player.seek(targetTime)
            }
          }

          if (action.isPlaying && !player.isPlaying) player.play()
          if (!action.isPlaying && player.isPlaying) player.pause()
          break
        }

        case "CHANGE_SONG": {
          if (!action.song) break
          if (action.queue?.length) {
            player.setQueue(action.queue, action.index || 0)
          } else {
            player.setQueue([action.song], 0)
          }
          player.seek(0)
          player.play()
          break
        }

        case "PLAY": {
          if (!player.isPlaying) player.play()
          break
        }

        case "PAUSE": {
          if (player.isPlaying) player.pause()
          break
        }

        case "SEEK": {
          const latencySec = Math.min((Date.now() - action.timestamp) / 1000, 5)
          const targetTime = action.time + (player.isPlaying ? latencySec : 0)
          const currentAudio = document.querySelector("audio") as HTMLAudioElement | null
          if (currentAudio) {
            const drift = Math.abs(currentAudio.currentTime - targetTime)
            if (drift > 1) {
              player.seek(targetTime)
            }
          }
          break
        }

        case "ROOM_MEMBERS": {
          if (Array.isArray(action.members)) {
            useJamStore.getState().setMembers(action.members)
          }
          break
        }
      }
    } finally {
      // Release sync lock after 300ms (covers react state flush + audio load)
      setTimeout(() => { this.isSyncing = false }, 300)
    }
  }

  // ── HOST: Heartbeat every 8s — only corrects large drift ─────────────────

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!useJamStore.getState().isHost) return
      const ps = usePlayerStore.getState()
      if (!ps.currentSong || !this.connections.size) return

      // Only broadcast heartbeat — don't flood with every second
      this.connections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send({
              type: "SYNC_STATE",
              song: ps.currentSong,
              isPlaying: ps.isPlaying,
              currentTime: ps.currentTime,
              timestamp: Date.now(),
            } as JamAction)
          } catch (e) { /* ignore */ }
        }
      })
    }, 8000)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ── CLEANUP ──────────────────────────────────────────────────────────────

  leave() {
    this.stopHeartbeat()
    this.connections.forEach((conn) => { try { conn.close() } catch (e) { /* ignore */ } })
    this.connections.clear()
    if (this.hostConnection) {
      try { this.hostConnection.close() } catch (e) { /* ignore */ }
      this.hostConnection = null
    }
    if (this.peer) {
      try { this.peer.destroy() } catch (e) { /* ignore */ }
      this.peer = null
    }
    useJamStore.getState().leaveJam()
  }
}

export const jamManager = new JamManager()
