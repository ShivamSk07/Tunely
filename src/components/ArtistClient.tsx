"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Image from "next/image"
import { User, Play, ArrowLeft, Disc, Music, Shuffle, ChevronDown } from "lucide-react"
import { usePlayerStore, Song } from "@/store/usePlayerStore"
import toast from "react-hot-toast"

interface ArtistPageAlbum {
  id: string
  link: string
  image?: string
  name: string
  year?: string
}

interface ArtistPageDetails {
  id: string
  name: string
  image?: string
  topSongs?: {
    id: string
    name: string
    artist?: string
    image?: string
    streamUrl?: string
    duration?: number
  }[]
  albums?: ArtistPageAlbum[]
}

interface RecommendedArtist {
  id: string
  name: string
  link?: string
  image?: string
  artist?: string
}

type ActiveTab = "popular" | "songs" | "albums"

export default function ArtistClient({ link }: { link: string }) {
  const router = useRouter()
  const setQueue = usePlayerStore((state) => state.setQueue)
  const currentSong = usePlayerStore((state) => state.currentSong)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const play = usePlayerStore((state) => state.play)
  const pause = usePlayerStore((state) => state.pause)

  const [activeTab, setActiveTab] = useState<ActiveTab>("popular")
  const [songsPage, setSongsPage] = useState(1)
  const [albumsPage, setAlbumsPage] = useState(1)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [allAlbums, setAllAlbums] = useState<ArtistPageAlbum[]>([])

  const { data: artist, isLoading, isError } = useQuery<ArtistPageDetails>({
    queryKey: ["artist", link],
    queryFn: async (): Promise<ArtistPageDetails> => {
      if (!link) throw new Error("No artist link provided")
      const res = await fetch(`/api/artist?link=${encodeURIComponent(link)}`)
      if (!res.ok) throw new Error("Failed to fetch artist details")
      return res.json()
    },
    enabled: !!link,
    staleTime: 300000,
    gcTime: 600000,
  })

  const [artistImg, setArtistImg] = useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (artist?.image) {
      setArtistImg(artist.image)
    }
  }, [artist?.image])

  // Fetch recommended artists
  const { data: recommendations } = useQuery<RecommendedArtist[]>({
    queryKey: ["artistRecommend", artist?.id],
    queryFn: async (): Promise<RecommendedArtist[]> => {
      if (!artist?.id) return []
      const res = await fetch(`/api/artist/recommend?id=${artist.id}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    },
    enabled: !!artist?.id,
    staleTime: 300000,
  })

  // Paginated artist songs
  const { data: moreSongsData, isLoading: isLoadingMoreSongs, isFetching: isFetchingSongs } = useQuery({
    queryKey: ["artistSongs", artist?.id, songsPage],
    queryFn: async () => {
      if (!artist?.id) return { data: [], total: 0 }
      const res = await fetch(`/api/artist/songs?id=${artist.id}&page=${songsPage}&cat=latest&sort=desc`)
      if (!res.ok) return { data: [], total: 0 }
      return res.json()
    },
    enabled: !!artist?.id && activeTab === "songs",
    staleTime: 300000,
  })

  // Synchronize paginated songs with state
  React.useEffect(() => {
    if (moreSongsData?.data?.length) {
      setAllSongs(prev => {
        const existingIds = new Set(prev.map(s => s.id))
        const newSongs = (moreSongsData.data as Song[]).filter(s => !existingIds.has(s.id))
        return [...prev, ...newSongs]
      })
    }
  }, [moreSongsData])

  // Paginated artist albums
  const { data: moreAlbumsData, isLoading: isLoadingMoreAlbums, isFetching: isFetchingAlbums } = useQuery({
    queryKey: ["artistAlbums", artist?.id, albumsPage],
    queryFn: async () => {
      if (!artist?.id) return { data: [], total: 0 }
      const res = await fetch(`/api/artist/albums?id=${artist.id}&page=${albumsPage}&cat=latest&sort=desc`)
      if (!res.ok) return { data: [], total: 0 }
      return res.json()
    },
    enabled: !!artist?.id && activeTab === "albums",
    staleTime: 300000,
  })

  // Synchronize paginated albums with state
  React.useEffect(() => {
    if (moreAlbumsData?.data?.length) {
      setAllAlbums(prev => {
        const existingIds = new Set(prev.map((a: ArtistPageAlbum) => a.id))
        const newAlbums = (moreAlbumsData.data as ArtistPageAlbum[]).filter(a => !existingIds.has(a.id))
        return [...prev, ...newAlbums]
      })
    }
  }, [moreAlbumsData])

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-64 shimmer rounded-2xl animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 shimmer rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !artist) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
        <User size={56} className="text-[#727272]" />
        <p className="text-white font-bold text-lg">Artist not found</p>
        <p className="text-[#B3B3B3] text-sm">Could not load this artist profile.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:scale-105 transition-transform"
        >
          Go Back
        </button>
      </div>
    )
  }

  const songsList: Song[] = (artist.topSongs || []).map((song) => ({
    id: song.id,
    name: song.name,
    artist: song.artist || artist.name || "Artist",
    image: song.image || artist.image || "",
    streamUrl: song.streamUrl || "",
    duration: song.duration || 0,
  }))

  const displaySongs = activeTab === "songs" && allSongs.length > 0 ? allSongs : songsList
  const displayAlbums = activeTab === "albums" && allAlbums.length > 0
    ? allAlbums
    : (artist.albums || [])

  const handlePlayAll = () => { if (songsList.length > 0) setQueue(songsList, 0) }
  const handleShuffle = () => {
    if (songsList.length === 0) return
    setQueue([...songsList].sort(() => Math.random() - 0.5), 0)
  }

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: "popular", label: "Popular" },
    { key: "songs", label: "All Songs" },
    { key: "albums", label: "Albums" },
  ]

  return (
    <div className="min-h-full pb-36 md:pb-12 select-none">
      {/* Hero header */}
      <div className="relative overflow-hidden" style={{ minHeight: "300px" }}>
        {artistImg && (
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-30"
            style={{ backgroundImage: `url(${artistImg})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0f]" />

        <div className="relative z-10 px-4 md:px-6 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>

        <div className="relative z-10 px-4 md:px-6 pt-4 pb-6 flex items-end gap-4 md:gap-6">
          {artistImg ? (
            <Image
              src={artistImg}
              alt={artist.name}
              width={176}
              height={176}
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover shadow-2xl border-4 border-white/10 flex-shrink-0"
              priority
              onError={() => {
                setArtistImg("https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&auto=format&fit=crop")
              }}
            />
          ) : (
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#282828] flex items-center justify-center flex-shrink-0 border-4 border-white/10 shadow-2xl">
              <User size={64} className="text-[#727272]" />
            </div>
          )}
          <div className="min-w-0 pb-2 text-left">
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Verified Artist</p>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-none mb-3">{artist.name}</h1>
            <p className="text-sm text-white/60">
              {songsList.length > 0 ? `${songsList.length} top tracks` : ""}
              {artist.albums && artist.albums.length > 0
                ? `${songsList.length > 0 ? " · " : ""}${artist.albums.length} albums`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 md:px-6 py-4 flex items-center gap-4">
        {songsList.length > 0 && (
          <>
            <button
              onClick={handlePlayAll}
              className="w-14 h-14 rounded-full bg-[#6C63FF] flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-[#6C63FF44]"
            >
              <Play size={24} className="fill-white text-white ml-1" />
            </button>
            <button
              onClick={handleShuffle}
              className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors"
              title="Shuffle Play"
            >
              <Shuffle size={20} />
            </button>
          </>
        )}

      </div>

      {/* Tab switcher */}
      <div className="px-4 md:px-6 mb-6">
        <div className="flex gap-1 bg-[#1a1a24] p-1 rounded-full w-fit overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab.key ? "bg-white text-black shadow" : "text-[#B3B3B3] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-6 pb-8">
        {/* ── POPULAR TAB ── */}
        {activeTab === "popular" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Songs */}
            <div className="lg:col-span-2 space-y-1">
              <h2 className="text-2xl font-black text-white mb-4 text-left">Popular</h2>
              {songsList.length === 0 ? (
                <div className="py-16 text-center">
                  <Music size={48} className="text-[#727272] mx-auto mb-3" />
                  <p className="text-[#B3B3B3] font-medium">No songs found for this artist</p>
                </div>
              ) : (
                songsList.map((song, i) => {
                  const isCurrent = currentSong?.id === song.id
                  return (
                    <div
                      key={song.id}
                      className="song-row flex items-center gap-4 px-4 py-2 rounded-md cursor-pointer group"
                      onClick={() => {
                        if (isCurrent) { isPlaying ? pause() : play() }
                        else setQueue(songsList, i)
                      }}
                    >
                      <span className={`w-5 text-center text-sm select-none group-hover:hidden ${isCurrent ? "text-[#6C63FF]" : "text-[#B3B3B3]"}`}>
                        {isCurrent && isPlaying ? (
                          <span className="eq-container inline-flex" style={{ height: "16px" }}>
                            <span className="eq-bar-1" /><span className="eq-bar-2" /><span className="eq-bar-3" />
                          </span>
                        ) : i + 1}
                      </span>
                      <Play size={14} className="song-row-play hidden fill-white text-white flex-shrink-0 w-5" />
                      {song.image ? (
                        <Image src={song.image} alt={song.name} width={40} height={40} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center flex-shrink-0">
                          <Music size={16} className="text-[#727272]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${isCurrent ? "text-[#6C63FF]" : "text-white"}`}>{song.name}</p>
                        <p className="text-xs text-[#B3B3B3] truncate">{song.artist}</p>
                      </div>
                      <span className="text-xs text-[#B3B3B3] tabular-nums hidden sm:block">
                        {Math.floor((song.duration || 0) / 60)}:{String(Math.floor((song.duration || 0) % 60)).padStart(2, "0")}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Albums sidebar */}
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white text-left">Discography</h2>
              {!artist.albums || artist.albums.length === 0 ? (
                <div className="py-8 text-center">
                  <Disc size={32} className="text-[#727272] mx-auto mb-2" />
                  <p className="text-[#B3B3B3] text-sm">No albums listed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {artist.albums.slice(0, 8).map((album) => (
                    <Link
                      key={album.id || album.link}
                      href={`/album?link=${encodeURIComponent(album.link)}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors block text-left font-normal"
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-[#282828] flex-shrink-0">
                        {album.image ? (
                          <Image src={album.image} alt={album.name || "Album"} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Disc size={18} className="text-[#727272]" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-[#6C63FF] transition-colors">{album.name}</p>
                        <p className="text-xs text-[#B3B3B3]">{album.year || "Album"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ALL SONGS TAB (paginated) ── */}
        {activeTab === "songs" && (
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white mb-4">All Songs</h2>
            {(isLoadingMoreSongs && allSongs.length === 0) ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-14 bg-[#1a1a24] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : displaySongs.length === 0 ? (
              <div className="py-16 text-center">
                <Music size={48} className="text-[#727272] mx-auto mb-3" />
                <p className="text-[#B3B3B3]">No songs found</p>
              </div>
            ) : (
              <>
                {displaySongs.map((song, i) => {
                  const isCurrent = currentSong?.id === song.id
                  return (
                    <div
                      key={song.id}
                      className="song-row flex items-center gap-4 px-4 py-2 rounded-md cursor-pointer group"
                      onClick={() => {
                        if (isCurrent) { isPlaying ? pause() : play() }
                        else setQueue(displaySongs, i)
                      }}
                    >
                      <span className={`w-5 text-center text-sm select-none group-hover:hidden ${isCurrent ? "text-[#6C63FF]" : "text-[#B3B3B3]"}`}>
                        {isCurrent && isPlaying ? (
                          <span className="eq-container inline-flex" style={{ height: "16px" }}>
                            <span className="eq-bar-1" /><span className="eq-bar-2" /><span className="eq-bar-3" />
                          </span>
                        ) : i + 1}
                      </span>
                      <Play size={14} className="song-row-play hidden fill-white text-white flex-shrink-0 w-5" />
                      {song.image ? (
                        <Image src={song.image} alt={song.name} width={40} height={40} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center flex-shrink-0">
                          <Music size={16} className="text-[#727272]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${isCurrent ? "text-[#6C63FF]" : "text-white"}`}>{song.name}</p>
                        <p className="text-xs text-[#B3B3B3] truncate">{song.artist}</p>
                      </div>
                      <span className="text-xs text-[#B3B3B3] tabular-nums hidden sm:block">
                        {Math.floor((song.duration || 0) / 60)}:{String(Math.floor((song.duration || 0) % 60)).padStart(2, "0")}
                      </span>
                    </div>
                  )
                })}
                {/* Load More */}
                <div className="pt-4 text-center">
                  <button
                    onClick={() => setSongsPage(p => p + 1)}
                    disabled={isFetchingSongs}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a1a24] hover:bg-[#282828] text-white text-sm font-semibold rounded-full border border-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                  >
                    {isFetchingSongs ? "Loading..." : <><ChevronDown size={16} /> Load More</>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ALBUMS TAB (paginated) ── */}
        {activeTab === "albums" && (
          <div>
            <h2 className="text-2xl font-black text-white mb-4">Albums</h2>
            {(isLoadingMoreAlbums && allAlbums.length === 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-square bg-[#1a1a24] rounded-xl" />
                    <div className="h-3 bg-[#1a1a24] rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : displayAlbums.length === 0 ? (
              <div className="py-16 text-center">
                <Disc size={48} className="text-[#727272] mx-auto mb-3" />
                <p className="text-[#B3B3B3]">No albums found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {displayAlbums.map((album) => (
                    <Link
                      key={album.id || album.link}
                      href={`/album?link=${encodeURIComponent(album.link)}`}
                      className="group playlist-card bg-[#181818] hover:bg-[#282828] p-3 rounded-xl transition-all block font-normal"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-[#282828]">
                        {album.image ? (
                          <Image src={album.image} alt={album.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Disc size={40} className="text-[#727272]" /></div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white truncate group-hover:text-[#6C63FF] transition-colors">{album.name}</p>
                      <p className="text-xs text-[#B3B3B3] mt-0.5">{album.year || "Album"}</p>
                    </Link>
                  ))}
                </div>
                <div className="pt-6 text-center">
                  <button
                    onClick={() => setAlbumsPage(p => p + 1)}
                    disabled={isFetchingAlbums}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a1a24] hover:bg-[#282828] text-white text-sm font-semibold rounded-full border border-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                  >
                    {isFetchingAlbums ? "Loading..." : <><ChevronDown size={16} /> Load More</>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="px-6 mt-4 pb-8">
          <h2 className="text-2xl font-black text-white mb-6 text-left">Fans Also Like</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
            {recommendations.map((art) => (
              <Link
                key={art.id}
                href={art.link ? `/artist?link=${encodeURIComponent(art.link)}` : `/search?query=${encodeURIComponent(art.name)}`}
                className="flex-shrink-0 w-36 sm:w-44 bg-[#12121E]/60 border border-[#6C63FF11] hover:border-[#6C63FF33] hover:bg-[#12121E]/95 p-4 rounded-2xl cursor-pointer transition-all duration-300 snap-start text-center group block font-normal"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mx-auto border border-white/5 bg-[#080810] shadow-md group-hover:scale-105 transition-transform duration-300 relative">
                  {art.image ? (
                    <Image src={art.image} alt={art.name} width={112} height={112} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-gray-600" /></div>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white truncate mt-3 group-hover:text-[#6C63FF] transition-colors">{art.name}</h3>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest block mt-1">{art.artist || "Artist"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
