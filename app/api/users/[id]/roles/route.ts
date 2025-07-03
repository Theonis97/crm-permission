import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const { roleIds } = await request.json()

    // Supprimer tous les rôles actuels
    await prisma.userRole.deleteMany({
      where: { userId },
    })

    // Ajouter les nouveaux rôles
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId,
          roleId,
          assignedBy: session.user.id,
        })),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user roles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
