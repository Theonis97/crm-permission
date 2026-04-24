import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Liste des notifications in-app pour l’utilisateur connecté. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const [items, unreadCount] = await Promise.all([
      prisma.staffInAppNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          body: true,
          kind: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.staffInAppNotification.count({
        where: { userId: user.id, isRead: false },
      }),
    ])

    return NextResponse.json({ success: true, items, unreadCount })
  } catch (e) {
    console.error("[GET /api/notifications]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

/** Marquer comme lues : { ids: string[] } ou { markAll: true }. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { ids, markAll } = body as { ids?: string[]; markAll?: boolean }

    if (markAll === true) {
      await prisma.staffInAppNotification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ success: true })
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids ou markAll requis" }, { status: 400 })
    }

    await prisma.staffInAppNotification.updateMany({
      where: {
        userId: user.id,
        id: { in: ids },
      },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[PATCH /api/notifications]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
