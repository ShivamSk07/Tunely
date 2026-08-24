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
  | { type: "ROOM_MEMBERS"; members: { id: string; name: string }[] }

class JamManager {
  private peer: PeerType | null = null
  private connections: Map<string, DataConnection> = new Map()
  private hostConnection: DataConnection | null = null
  private heartbeatTimer: any = null
  private myName: string = "Listener"

  // Initialize a Host Room
  async createRoom(hostName: string = "Host"): Promise<string> {
    this.leave()
    this.myName = hostName

    const { default: Peer } = await import("peerjs")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
    const roomId = `tunely-${randomSuffix}`

    return new Promise((resolve, reject) => {
      useJamStore.getState().setConnectionStatus("connecting")

      const peer = new Peer(roomId, {
        debug: 1,
      })

      peer.on("open", (id) => {
        this.peer = peer
        useJamStore.getState().setJamSession({
          roomId: id,
          peerId: id,
          isHost: true,
        })
        useJamStore.getState().setMembers([{ id, name: hostName, isHost: true }])
        this.startHostHeartbeat()
        resolve(id)
      })

      peer.on("connection", (conn) => {
        this.handleIncomingConnectionAsHost(conn)
      })

      peer.on("error", (err: any) => {
        console.error("Jam Peer error:", err)
        useJamStore.getState().setConnectionStatus("error", err?.message || "Connection failed")
        if (err.type === "unavailable-id") {
          // Retry with another ID
          this.createRoom(hostName).then(resolve).catch(reject)
        } else {
          reject(err)
        }
      })
    })
  }

  // Join an existing room as a listener
  async joinRoom(roomId: string, listenerName: string = "Listener"): Promise<void> {
    this.leave()
    this.myName = listenerName
    const cleanRoomId = roomId.trim().toLowerCase()

    const { default: Peer } = await import("peerjs")

    return new Promise((resolve, reject) => {
      useJamStore.getState().setConnectionStatus("connecting")

      const peer = new Peer({
        debug: 1,
      })

      peer.on("open", (myPeerId) => {
        this.peer = peer
        const conn = peer.connect(cleanRoomId, {
          reliable: true,
        })

        conn.on("open", () => {
          this.hostConnection = conn
          useJamStore.getState().setJamSession({
            roomId: cleanRoomId,
            peerId: myPeerId,
            isHost: false,
          })

          // Send self info to host
          conn.send({
            type: "MEMBER_INFO",
            name: listenerName,
            id: myPeerId,
          } as JamAction)

          resolve()
        })

        conn.on("data", (data: any) => {
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

  // Host broadcasts playback actions to all joined listeners
  broadcast(action: JamAction) {
    if (!useJamStore.getState().isHost) return
    const payload = JSON.stringify(action)
    this.connections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(action)
        } catch (e) {
          console.warn("Could not broadcast to peer:", conn.peer, e)
        }
      }
    })
  }

  private handleIncomingConnectionAsHost(conn: DataConnection) {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn)

      // Send initial current playback state to the newly joined peer
      const playerState = usePlayerStore.getState()
      const syncAction: JamAction = {
        type: "SYNC_STATE",
        song: playerState.currentSong,
        isPlaying: playerState.isPlaying,
        currentTime: playerState.currentTime,
        timestamp: Date.now(),
      }
      conn.send(syncAction)
      this.broadcastMembersList()
    })

    conn.on("data", (data: any) => {
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
    this.broadcast({
      type: "ROOM_MEMBERS",
      members,
    })
  }

  // Listener receives actions from the Host
  private handleActionAsListener(action: JamAction) {
    const player = usePlayerStore.getState()

    switch (action.type) {
      case "SYNC_STATE": {
        if (action.song) {
          const isSameSong = player.currentSong?.id === action.song.id
          if (!isSameSong) {
            player.setQueue([action.song], 0)
          }

          const latency = (Date.now() - action.timestamp) / 1000
          const targetTime = action.currentTime + (action.isPlaying ? Math.max(0, latency) : 0)
          player.seek(targetTime)

          if (action.isPlaying) {
            player.play()
          } else {
            player.pause()
          }
        }
        break
      }

      case "CHANGE_SONG": {
        if (action.song) {
          if (action.queue && action.queue.length > 0) {
            player.setQueue(action.queue, action.index || 0)
          } else {
            player.setQueue([action.song], 0)
          }
          player.seek(0)
          player.play()
        }
        break
      }

      case "PLAY": {
        player.play()
        break
      }

      case "PAUSE": {
        player.pause()
        break
      }

      case "SEEK": {
        const latency = (Date.now() - action.timestamp) / 1000
        const targetTime = action.time + (player.isPlaying ? Math.max(0, latency) : 0)
        player.seek(targetTime)
        break
      }

      case "ROOM_MEMBERS": {
        if (Array.isArray(action.members)) {
          useJamStore.getState().setMembers(action.members)
        }
        break
      }
    }
  }

  // Periodic heartbeat from Host to keep all listeners clock-drift free
  private startHostHeartbeat() {
    this.stopHostHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!useJamStore.getState().isHost) return
      const player = usePlayerStore.getState()
      if (player.currentSong && this.connections.size > 0) {
        this.broadcast({
          type: "SYNC_STATE",
          song: player.currentSong,
          isPlaying: player.isPlaying,
          currentTime: player.currentTime,
          timestamp: Date.now(),
        })
      }
    }, 4000)
  }

  private stopHostHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  leave() {
    this.stopHostHeartbeat()

    this.connections.forEach((conn) => conn.close())
    this.connections.clear()

    if (this.hostConnection) {
      this.hostConnection.close()
      this.hostConnection = null
    }

    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }

    useJamStore.getState().leaveJam()
  }
}

export const jamManager = new JamManager()
