import { create } from "zustand"

interface AppState {
  isAppReady: boolean
  setAppReady: () => void
}

export const useAppStore = create<AppState>((set) => ({
  isAppReady: false,
  setAppReady: () => set({ isAppReady: true }),
}))
