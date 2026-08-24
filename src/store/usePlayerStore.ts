import { create } from "zustand"
import toast from "react-hot-toast"

const updateStreak = (song: any) => {
  if (typeof window === "undefined" || !song) return
  try {
    const today = new Date().toDateString()
    const raw = localStorage.getItem('streak_data')
    const data = raw ? JSON.parse(raw) : {}

    data.todayCount = (data.lastDate === today ? data.todayCount : 0) + 1
    
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    if (data.lastDate === yesterday) {
      data.streakDays = (data.streakDays || 0) + 1
    } else if (data.lastDate !== today) {
      data.streakDays = 1
    }
    data.lastDate = today

    // Artist tracking — from actual played songs only
    const artists = data.artists || {}
    const artistName = song?.artist || song?.subtitle || ''
    if (artistName) {
      artists[artistName] = (artists[artistName] || 0) + 1
    }
    data.artists = artists

    localStorage.setItem('streak_data', JSON.stringify(data))
  } catch (err) {
    console.warn("Could not update local listening stats:", err)
  }
}

export interface Song {
  id: string
  name: string
  artist: string
  image: string
  streamUrl: string
  duration: number
  downloadUrls?: { quality: string; link: string }[]
  url?: string
  year?: string | number
  playCount?: string | number
}

interface PlayerState {
  currentSong: Song | null
  isPlaying: boolean
  queue: Song[]
  currentIndex: number
  volume: number
  currentTime: number
  duration: number
  isAuthModalOpen: boolean
  isQueueOpen: boolean
  isLyricsOpen: boolean
  isExpandedPlayerOpen: boolean
  eqBands: Record<string, number>
  
  // Audio streaming quality
  streamQuality: "12kbps" | "48kbps" | "96kbps" | "160kbps" | "320kbps"
  setStreamQuality: (quality: "12kbps" | "48kbps" | "96kbps" | "160kbps" | "320kbps") => void

  // Radio Mode fields
  isRadioMode: boolean
  radioSeedId: string | null
  radioSeedType: 'song' | 'artist' | 'album' | null
  isFetchingRadio: boolean

  // Setters & Actions
  setCurrentSong: (song: Song | null) => void
  setQueue: (queue: Song[], startIndex?: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setVolume: (volume: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setAuthModalOpen: (isOpen: boolean) => void
  setQueueOpen: (isOpen: boolean) => void
  setLyricsOpen: (isOpen: boolean) => void
  toggleLyrics: () => void
  setExpandedPlayerOpen: (isOpen: boolean) => void
  toggleExpandedPlayer: () => void
  setEqBands: (bands: Record<string, number>) => void
  
  play: (song?: Song) => void
  pause: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void

  // Sleep Timer fields
  sleepTimerSelected: number | null
  sleepTimerRemaining: number | null
  setSleepTimer: (minutes: number | null) => void
  decrementSleepTimer: () => void

  // New Radio & Queue actions
  setRadioMode: (isRadioMode: boolean, seedId?: string | null, seedType?: 'song' | 'artist' | 'album' | null) => void
  startRadioMode: (seedId: string, seedType: 'song' | 'artist' | 'album', seedName?: string) => Promise<void>
  fetchMoreRadioSongs: () => Promise<void>
  playNext: (song: Song) => void
  addToQueue: (song: Song) => void
  hydrateStore: () => void
  lyricsCache: Record<string, { plain: string | null; synced: string | null }>
  prefetchLyrics: (song: Song) => Promise<void>
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  return {
    currentSong: null,
    isPlaying: false,
    queue: [],
    currentIndex: -1,
    volume: 0.5,
    currentTime: 0,
    duration: 0,
    isAuthModalOpen: false,
    isQueueOpen: false,
    isLyricsOpen: false,
    isExpandedPlayerOpen: false,
    eqBands: { sub: 0, bass: 0, mid: 0, presence: 0, treble: 0 },
    streamQuality: "320kbps",

    setStreamQuality: (quality) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("tunely-stream-quality", quality)
      }
      set({ streamQuality: quality })
      
      const { currentSong, queue } = get()
      if (currentSong && currentSong.downloadUrls && currentSong.downloadUrls.length > 0) {
        const urls = currentSong.downloadUrls
        const match = urls.find((u) => u.quality === quality) || urls[urls.length - 1]
        if (match) {
          const updatedSong = { ...currentSong, streamUrl: match.link.replace("http://", "https://") }
          set({ currentSong: updatedSong })
          
          // Force reload active HTML5 audio element
          const currentAudio = document.querySelector("audio")
          if (currentAudio) {
            const time = currentAudio.currentTime
            const wasPlaying = !currentAudio.paused
            currentAudio.src = updatedSong.streamUrl
            currentAudio.load()
            currentAudio.currentTime = time
            if (wasPlaying) {
              currentAudio.play().catch(console.error)
            }
          }
          
          // Also update matching song in queue
          const updatedQueue = queue.map(s => {
            if (s.id === currentSong.id) {
              return { ...s, streamUrl: match.link.replace("http://", "https://") }
            }
            return s
          })
          set({ queue: updatedQueue })
          toast.success(`Stream quality set to ${quality}`, { id: "quality-toast" })
        }
      }
    },

    // Sleep Timer defaults
    sleepTimerSelected: null,
    sleepTimerRemaining: null,

    // Radio Mode defaults
    isRadioMode: false,
    radioSeedId: null,
    radioSeedType: null,
    isFetchingRadio: false,

    setCurrentSong: (song) => {
      if (!song) {
        set({ currentSong: null, isPlaying: false, currentIndex: -1 })
        return
      }

      // Update streamUrl based on selected quality
      const quality = get().streamQuality
      let updatedSong = song
      if (song && song.downloadUrls && song.downloadUrls.length > 0) {
        const urls = song.downloadUrls
        const match = urls.find((u) => u.quality === quality) || urls[urls.length - 1]
        if (match) {
          updatedSong = { ...song, streamUrl: match.link.replace("http://", "https://") }
        }
      }

      const { queue, isRadioMode } = get()
      const index = queue.findIndex((s) => s.id === updatedSong.id)
      if (index !== -1) {
        set({ currentSong: updatedSong, currentIndex: index })
        updateStreak(updatedSong)
        
        // In radio mode, check if we need to fetch more songs (if near end of queue)
        if (isRadioMode && index >= queue.length - 3) {
          get().fetchMoreRadioSongs()
        }
      } else {
        // Append to queue if not present
        const newQueue = [...queue, updatedSong]
        const newIndex = newQueue.length - 1
        set({ queue: newQueue, currentSong: updatedSong, currentIndex: newIndex })
        updateStreak(updatedSong)

        // In radio mode, check if we need to fetch more songs
        if (isRadioMode && newIndex >= newQueue.length - 3) {
          get().fetchMoreRadioSongs()
        }
      }
    },

    setQueue: (newQueue, startIndex = 0) => {
      if (newQueue.length === 0) {
        set({ queue: [], currentSong: null, currentIndex: -1, isPlaying: false })
        return
      }

      // Format queue songs based on chosen quality
      const quality = get().streamQuality
      const formattedQueue = newQueue.map(s => {
        if (s.downloadUrls && s.downloadUrls.length > 0) {
          const urls = s.downloadUrls
          const match = urls.find((u) => u.quality === quality) || urls[urls.length - 1]
          if (match) {
            return { ...s, streamUrl: match.link.replace("http://", "https://") }
          }
        }
        return s
      })

      const song = formattedQueue[startIndex] || formattedQueue[0]
      set({
          queue: formattedQueue,
          currentSong: song,
          currentIndex: startIndex,
          isPlaying: true,
      })
      updateStreak(song)

      // In radio mode, check if we need to prefetch right away
      const { isRadioMode } = get()
      if (isRadioMode && startIndex >= formattedQueue.length - 3) {
        get().fetchMoreRadioSongs()
      }
    },

    setIsPlaying: (isPlaying) => set({ isPlaying }),

    setVolume: (volume) => {
      const boundedVol = Math.max(0, Math.min(1, volume))
      set({ volume: boundedVol })
    },

    setCurrentTime: (currentTime) => set({ currentTime }),
    setDuration: (duration) => set({ duration }),
    setAuthModalOpen: (isAuthModalOpen) => set({ isAuthModalOpen }),
    setQueueOpen: (isQueueOpen) => {
      set({ isQueueOpen })
      if (isQueueOpen) set({ isLyricsOpen: false })
    },
    setLyricsOpen: (isLyricsOpen) => {
      set({ isLyricsOpen })
      if (isLyricsOpen) set({ isQueueOpen: false })
    },
    toggleLyrics: () => {
      const open = !get().isLyricsOpen
      set({ isLyricsOpen: open })
      if (open) set({ isQueueOpen: false })
    },
    setExpandedPlayerOpen: (isExpandedPlayerOpen) => set({ isExpandedPlayerOpen }),
    toggleExpandedPlayer: () => set({ isExpandedPlayerOpen: !get().isExpandedPlayerOpen }),
    setEqBands: (eqBands) => set({ eqBands }),
    hydrateStore: () => {
      if (typeof window === "undefined") return
      try {
        const savedEq = localStorage.getItem("tunely-eq")
        const savedQuality = localStorage.getItem("tunely-stream-quality") as PlayerState["streamQuality"]
        set({
          eqBands: savedEq ? JSON.parse(savedEq) : { sub: 0, bass: 0, mid: 0, presence: 0, treble: 0 },
          streamQuality: savedQuality || "320kbps",
        })
      } catch (e) {
        console.error("Failed to hydrate player store:", e)
      }
    },

    play: (song) => {
      if (song) {
        get().setCurrentSong(song)
        set({ isPlaying: true })
      } else if (get().currentSong) {
        set({ isPlaying: true })
      }
    },

    pause: () => set({ isPlaying: false }),

    next: () => {
      const { queue, currentIndex, isRadioMode } = get()
      if (queue.length === 0) return
      
      const nextIndex = (currentIndex + 1) % queue.length
      const nextSong = queue[nextIndex]
      set({
        currentIndex: nextIndex,
        currentSong: nextSong,
        isPlaying: true,
      })
      updateStreak(nextSong)

      // If in radio mode, pre-fetch more songs automatically when 2 songs before the last song
      if (isRadioMode && nextIndex >= queue.length - 3) {
        get().fetchMoreRadioSongs()
      }
    },

    prev: () => {
      const { queue, currentIndex } = get()
      if (queue.length === 0) return
      
      const prevIndex = (currentIndex - 1 + queue.length) % queue.length
      const prevSong = queue[prevIndex]
      set({
        currentIndex: prevIndex,
        currentSong: prevSong,
        isPlaying: true,
      })
      updateStreak(prevSong)
    },

    seek: (time) => {
      set({ currentTime: time })
    },

    // --- New Radio Mode & Queue Actions ---
    setRadioMode: (isRadioMode, seedId = null, seedType = null) => {
      set({ isRadioMode, radioSeedId: seedId, radioSeedType: seedType })
    },

    startRadioMode: async (seedId, seedType, seedName = "") => {
      set({
        isRadioMode: true,
        radioSeedId: seedId,
        radioSeedType: seedType,
        isFetchingRadio: true,
      })

      try {
        console.log(`[Radio Store] Starting radio for seed: ${seedId} (${seedType}), name: ${seedName}`)
        const res = await fetch(`/api/radio?id=${seedId}&type=${seedType}&name=${encodeURIComponent(seedName)}`)
        if (res.ok) {
          const json = await res.json()
          const songs = json?.data || []
          if (songs.length > 0) {
            set({
              queue: songs,
              currentIndex: 0,
              currentSong: songs[0],
              isPlaying: true,
            })

            // Trigger an early prefetch check as well if queue is short
            if (songs.length <= 3) {
              get().fetchMoreRadioSongs()
            }
          }
        }
      } catch (err) {
        console.error("Failed to start radio in store:", err)
      } finally {
        set({ isFetchingRadio: false })
      }
    },

    fetchMoreRadioSongs: async () => {
      const { isRadioMode, radioSeedId, radioSeedType, queue, isFetchingRadio } = get()
      if (!isRadioMode || !radioSeedId || !radioSeedType || isFetchingRadio) return

      set({ isFetchingRadio: true })
      try {
        console.log(`[Radio Store] Fetching more radio songs. Current queue: ${queue.length}`)
        const res = await fetch(`/api/radio?id=${radioSeedId}&type=${radioSeedType}`)
        if (res.ok) {
          const json = await res.json()
          const newSongs = json?.data || []
          if (newSongs.length > 0) {
            // Filter out duplicates
            const existingIds = new Set(queue.map((s) => s.id))
            const deduped = newSongs.filter((s: Song) => !existingIds.has(s.id))
            
            if (deduped.length > 0) {
              set({ queue: [...queue, ...deduped] })
              console.log(`[Radio Store] Appended ${deduped.length} songs to queue. New size: ${queue.length + deduped.length}`)
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch more radio songs in store:", e)
      } finally {
        set({ isFetchingRadio: false })
      }
    },

    playNext: (song) => {
      const { queue, currentIndex } = get()
      // Filter out song if it already exists in queue to prevent double play
      const filteredQueue = queue.filter((s) => s.id !== song.id)
      
      let nextIndex = 0
      let updatedQueue = []

      if (filteredQueue.length === 0) {
        updatedQueue = [song]
        nextIndex = 0
      } else {
        // If queue is active, insert right after the current index
        const currentActiveIndex = currentIndex === -1 ? 0 : currentIndex
        updatedQueue = [
          ...filteredQueue.slice(0, currentActiveIndex + 1),
          song,
          ...filteredQueue.slice(currentActiveIndex + 1),
        ]
        nextIndex = currentActiveIndex
      }

      set({
        queue: updatedQueue,
        currentIndex: nextIndex,
      })
    },

    addToQueue: (song) => {
      const { queue } = get()
      // Avoid duplicates in queue
      if (queue.some((s) => s.id === song.id)) return
      
      set({
        queue: [...queue, song],
      })
    },

    setSleepTimer: (minutes) => {
      if (minutes === null) {
        set({ sleepTimerSelected: null, sleepTimerRemaining: null })
      } else {
        set({ sleepTimerSelected: minutes, sleepTimerRemaining: minutes * 60 })
      }
    },

    decrementSleepTimer: () => {
      const { sleepTimerRemaining, pause } = get()
      if (sleepTimerRemaining === null) return
      
      if (sleepTimerRemaining <= 1) {
        pause()
        set({ sleepTimerSelected: null, sleepTimerRemaining: null })
        toast.success("Sleep timer: Playback stopped. Goodnight!")
      } else {
        set({ sleepTimerRemaining: sleepTimerRemaining - 1 })
      }
    },

    lyricsCache: {},

    prefetchLyrics: async (song) => {
      if (!song) return
      const { lyricsCache } = get()
      // Already fetched (success or failed sentinel) — skip
      if (lyricsCache[song.id] !== undefined) return

      const url = `/api/lyrics?songName=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artist)}&lyricsId=${encodeURIComponent(song.id)}`
      try {
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          set((state) => ({
            lyricsCache: {
              ...state.lyricsCache,
              [song.id]: {
                plain: data.plain || null,
                synced: data.synced || null,
              }
            }
          }))
        } else {
          // Non-ok response — store null sentinel so LyricsPanel exits loading state
          set((state) => ({
            lyricsCache: {
              ...state.lyricsCache,
              [song.id]: { plain: null, synced: null }
            }
          }))
        }
      } catch (err) {
        console.error("Prefetch lyrics failed in store:", err)
        // Network error — store null sentinel so LyricsPanel exits loading state
        set((state) => ({
          lyricsCache: {
            ...state.lyricsCache,
            [song.id]: { plain: null, synced: null }
          }
        }))
      }
    },
  }
})
