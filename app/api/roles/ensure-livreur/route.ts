import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

const LIVREUR_ROLE_NAME = "Livreur"
const DRIVER_RESTOCK = {
  name: "driver.restock",
  description: "Accéder au portail de demande de réapprovisionnement (livreur)",
  module: "driver",
  action: "restock",
} as const

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allowed = await hasPermission(session.user.id, "roles.create")
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const permission = await prisma.permission.upsert({
      where: { name: DRIVER_RESTOCK.name },
      create: { ...DRIVER_RESTOCK },
      update: {},
    })

    let roleCreated = false
    let role = await prisma.role.findUnique({ where: { name: LIVREUR_ROLE_NAME } })

    if (!role) {
      roleCreated = true
      role = await prisma.role.create({
        data: {
          name: LIVREUR_ROLE_NAME,
          description: "Portail de demande de réapprovisionnement magasin (livreur)",
          isSystem: true,
        },
      })
    }

    const existingLink = await prisma.rolePermission.findFirst({
      where: { roleId: role.id, permissionId: permission.id },
    })
    let permissionLinked = false
    if (!existingLink) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      })
      permissionLinked = true
    }

    return NextResponse.json({
      ok: true,
      roleId: role.id,
      roleCreated,
      permissionLinked,
    })
  } catch (error) {
    console.error("ensure-livreur:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
