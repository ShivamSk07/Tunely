import { NextResponse } from "next/server"
import { getDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const likedSongs = await prisma.likedSong.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(likedSongs)
  } catch (error: any) {
    console.error("Error fetching liked songs:", error)
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
    const { songId, songName, artist, image, streamUrl, duration } = body

    if (!songId || !songName) {
      return NextResponse.json({ error: "Missing required song fields" }, { status: 400 })
    }

    // Check if already liked
    const existingLike = await prisma.likedSong.findFirst({
      where: {
        userId: user.id,
        songId: songId,
      },
    })

    if (existingLike) {
      // Remove like
      await prisma.likedSong.delete({
        where: { id: existingLike.id },
      })
      return NextResponse.json({ liked: false, message: "Removed from Liked Songs" })
    } else {
      // Add like
      const newLike = await prisma.likedSong.create({
        data: {
          userId: user.id,
          songId,
          songName,
          artist: artist || "Unknown Artist",
          image: image || "",
          streamUrl: streamUrl || "",
          duration: typeof duration === 'number' ? duration : 0,
        },
      })
      return NextResponse.json({ liked: true, message: "Added to Liked Songs", data: newLike })
    }
  } catch (error: any) {
    console.error("Error toggling like:", error)
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}
