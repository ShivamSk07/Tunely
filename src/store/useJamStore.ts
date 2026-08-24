import { create } from "zustand"

export interface JamMember {
  id: string
  name: string
  isHost?: boolean
}

export interface JamState {
  isInJam: boolean
  isHost: boolean
  roomId: string | null
  peerId: string | null
  members: JamMember[]
  isJamModalOpen: boolean
  connectionStatus: "disconnected" | "connecting" | "connected" | "error"
  errorMessage: string | null
  
  // Actions
  setJamModalOpen: (open: boolean) => void
  setJamSession: (data: { roomId: string; peerId: string; isHost: boolean }) => void
  setConnectionStatus: (status: "disconnected" | "connecting" | "connected" | "error", error?: string) => void
  setMembers: (members: JamMember[]) => void
  addMember: (member: JamMember) => void
  removeMember: (id: string) => void
  leaveJam: () => void
}

export const useJamStore = create<JamState>((set) => ({
  isInJam: false,
  isHost: false,
  roomId: null,
  peerId: null,
  members: [],
  isJamModalOpen: false,
  connectionStatus: "disconnected",
  errorMessage: null,

  setJamModalOpen: (open) => set({ isJamModalOpen: open }),
  
  setJamSession: ({ roomId, peerId, isHost }) =>
    set({
      isInJam: true,
      roomId,
      peerId,
      isHost,
      connectionStatus: "connected",
      errorMessage: null,
    }),

  setConnectionStatus: (status, error) =>
    set({ connectionStatus: status, errorMessage: error || null }),

  setMembers: (members) => set({ members }),

  addMember: (member) =>
    set((state) => {
      if (state.members.some((m) => m.id === member.id)) return state
      return { members: [...state.members, member] }
    }),

  removeMember: (id) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
    })),

  leaveJam: () =>
    set({
      isInJam: false,
      isHost: false,
      roomId: null,
      peerId: null,
      members: [],
      connectionStatus: "disconnected",
      errorMessage: null,
    }),
}))
