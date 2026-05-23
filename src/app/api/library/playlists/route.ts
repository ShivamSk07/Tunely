import { NextRequest, NextResponse } from "next/server"
import { getDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  try {
    if (id) {
      // Fetch specific playlist details with its songs
      const playlist = await prisma.playlist.findFirst({
        where: {
          id: id,
          userId: user.id,
        },
        include: {
          songs: {
            orderBy: { order: "asc" },
          },
        },
      })
      if (!playlist) {
        return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
      }
      return NextResponse.json(playlist)
    }

    // Otherwise, list all playlists for this user
    const playlists = await prisma.playlist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { songs: true },
        },
      },
    })
    return NextResponse.json(playlists)
  } catch (error: any) {
    console.error("Error in playlists GET API:", error)
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, image } = body

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 })
    }

    const playlist = await prisma.playlist.create({
      data: {
        userId: user.id,
        name,
        image: image || null,
      },
    })

    return NextResponse.json({ message: "Playlist created", data: playlist })
  } catch (error: any) {
    console.error("Error creating playlist:", error)
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Playlist ID is required" }, { status: 400 })
  }

  try {
    // Make sure playlist belongs to the user
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found or unauthorized" }, { status: 404 })
    }

    // Delete all songs in the playlist first
    await prisma.playlistSong.deleteMany({
      where: { playlistId: id },
    })

    // Delete the playlist
    await prisma.playlist.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Playlist deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting playlist:", error)
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}
