import { NextRequest, NextResponse } from "next/server"
import { getDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { playlistId, songId, songName, artist, image, streamUrl, duration } = body

    if (!playlistId || !songId || !songName) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Verify user owns the playlist
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id,
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found or unauthorized" }, { status: 404 })
    }

    // Check if song already exists in the playlist to avoid duplicate adds (optional, but clean)
    const existingSong = await prisma.playlistSong.findFirst({
      where: {
        playlistId,
        songId,
      },
    })

    if (existingSong) {
      return NextResponse.json({ error: "Song is already in this playlist" }, { status: 400 })
    }

    // Get maximum order to place this song at the end
    const lastSong = await prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const nextOrder = lastSong ? lastSong.order + 1 : 0

    const newPlaylistSong = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        songName,
        artist: artist || "Unknown Artist",
        image: image || "",
        streamUrl: streamUrl || "",
        duration: typeof duration === 'number' ? duration : 0,
        order: nextOrder,
      },
    })

    // If the playlist doesn't have a cover image yet, set it to the cover art of this first song
    if (!playlist.image && image) {
      await prisma.playlist.update({
        where: { id: playlistId },
        data: { image: image },
      })
    }

    return NextResponse.json({ message: "Song added to playlist", data: newPlaylistSong })
  } catch (error: any) {
    console.error("Error adding song to playlist:", error)
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const playlistId = searchParams.get("playlistId")
  const songId = searchParams.get("songId")

  if (!playlistId || !songId) {
    return NextResponse.json({ error: "Playlist ID and Song ID are required" }, { status: 400 })
  }

  try {
    // Verify user owns the playlist
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: user.id,
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found or unauthorized" }, { status: 404 })
    }

    // Find and delete the song in the playlist
    const songToDelete = await prisma.playlistSong.findFirst({
      where: {
        playlistId,
        songId,
      },
    })

    if (!songToDelete) {
      return NextResponse.json({ error: "Song not found in playlist" }, { status: 404 })
    }

    await prisma.playlistSong.delete({
      where: { id: songToDelete.id },
    })

    // Update cover art if playlist is now empty or check if it needs to change
    const remainingSongs = await prisma.playlistSong.findMany({
      where: { playlistId },
      orderBy: { order: "asc" },
      take: 1,
    })

    await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        image: remainingSongs.length > 0 ? remainingSongs[0].image : null,
      },
    })

    return NextResponse.json({ message: "Song removed from playlist" })
  } catch (error: any) {
    console.error("Error removing song from playlist:", error)
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}
