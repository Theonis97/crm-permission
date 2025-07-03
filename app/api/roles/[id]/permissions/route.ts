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

    const roleId = params.id
    const { permissionIds } = await request.json()

    // Supprimer toutes les permissions actuelles
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    })

    // Ajouter les nouvelles permissions
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId,
          permissionId,
        })),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating role permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
