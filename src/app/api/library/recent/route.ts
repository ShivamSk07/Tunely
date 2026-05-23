import { NextResponse } from "next/server"
import { getDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await getDbUser()
  if (!user) {
    // If not logged in, return empty array rather than error, for convenience in UI
    return NextResponse.json([])
  }

  try {
    const recent = await prisma.recentlyPlayed.findMany({
      where: { userId: user.id },
      orderBy: { playedAt: "desc" },
      take: 20,
    })
    return NextResponse.json(recent)
  } catch (error: any) {
    console.error("Error fetching recently played:", error)
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
    const { songId, songName, artist, image, streamUrl } = body

    if (!songId || !songName) {
      return NextResponse.json({ error: "Missing required song fields" }, { status: 400 })
    }

    // Check if the song was recently played. If so, delete it so we can re-create it at the top
    const existingRecent = await prisma.recentlyPlayed.findFirst({
      where: {
        userId: user.id,
        songId: songId,
      },
    })

    if (existingRecent) {
      await prisma.recentlyPlayed.delete({
        where: { id: existingRecent.id },
      })
    } else {
      // Limit to 20 records: if count is 20 or more, delete the oldest
      const count = await prisma.recentlyPlayed.count({
        where: { userId: user.id },
      })

      if (count >= 20) {
        const oldest = await prisma.recentlyPlayed.findFirst({
          where: { userId: user.id },
          orderBy: { playedAt: "asc" },
        })
        if (oldest) {
          await prisma.recentlyPlayed.delete({
            where: { id: oldest.id },
          })
        }
      }
    }

    // Create new recently played entry
    const newRecent = await prisma.recentlyPlayed.create({
      data: {
        userId: user.id,
        songId,
        songName,
        artist: artist || "Unknown Artist",
        image: image || "",
        streamUrl: streamUrl || "",
      },
    })

    return NextResponse.json(newRecent)
  } catch (error: any) {
    console.error("Error saving recently played:", error)
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 })
  }
}
