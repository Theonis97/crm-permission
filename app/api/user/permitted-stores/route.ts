
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/user/permitted-stores
// Retourne la liste des magasins où l'utilisateur a une permission spécifique
export async function GET(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const permission = searchParams.get("permission")

    if (!permission) {
      return NextResponse.json({ error: "Permission parameter is required" }, { status: 400 })
    }

    // Récupérer les rôles magasin de l'utilisateur qui ont cette permission
    const userStoreRoles = await prisma.storeUserRole.findMany({
      where: {
        userId: session.user.id,
        role: {
          storeRolePermissions: {
            some: {
              permission: {
                name: permission
              }
            }
          }
        }
      },
      include: {
        store: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const stores = userStoreRoles.map(role => role.store)

    return NextResponse.json({ stores })
  } catch (error) {
    console.error("[USER_PERMITTED_STORES_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
