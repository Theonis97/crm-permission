import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET /api/stores/[id]/users - Récupérer tous les utilisateurs d'un magasin avec leurs rôles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Récupérer tous les utilisateurs du magasin avec leurs rôles
    const storeUsers = await prisma.storeUserRole.findMany({
      where: { storeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        },
        role: {
          include: {
            storeRolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        assignedAt: "desc"
      }
    })

    // Grouper par utilisateur pour éviter les doublons
    const usersMap = new Map()
    
    storeUsers.forEach(storeUser => {
      const userId = storeUser.user.id
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          ...storeUser.user,
          storeRoles: []
        })
      }
      
      usersMap.get(userId).storeRoles.push({
        id: storeUser.role.id,
        name: storeUser.role.name,
        description: storeUser.role.description,
        isSystem: storeUser.role.isSystem,
        assignedAt: storeUser.assignedAt,
        assignedBy: storeUser.assignedByUser,
        permissions: storeUser.role.storeRolePermissions.map(rp => rp.permission)
      })
    })

    const users = Array.from(usersMap.values())

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching store users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/stores/[id]/users - Créer un utilisateur pour le magasin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()
    console.log("📝 Données reçues pour création utilisateur:", body)
    
    const { email, firstName, lastName, password = "password", roles } = body

    if (!email || !firstName || !lastName || !roles || !Array.isArray(roles) || roles.length === 0) {
      console.log("❌ Validation échouée")
      return NextResponse.json(
        { error: "Email, firstName, lastName and at least one role are required" },
        { status: 400 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Vérifier si l'utilisateur existe déjà
    console.log("🔍 Vérification de l'utilisateur existant pour:", email)
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    let targetUser: any = existingUser

    if (existingUser) {
      console.log("👤 Utilisateur existe déjà:", existingUser.id, "- Assignation au magasin")
      
      // Vérifier si l'utilisateur est déjà assigné à ce magasin
      const existingStoreAssignment = await prisma.storeUserRole.findFirst({
        where: {
          userId: existingUser.id,
          storeId
        }
      })

      if (existingStoreAssignment) {
        console.log("⚠️ Utilisateur déjà assigné à ce magasin")
        return NextResponse.json(
          { error: "Cet utilisateur est déjà membre de ce magasin" },
          { status: 400 }
        )
      }
    } else {
      console.log("✅ Email disponible - Création d'un nouvel utilisateur")
      
      // Hasher le mot de passe
      console.log("🔐 Hashage du mot de passe...")
      const hashedPassword = await bcrypt.hash(password, 12)

      // Créer l'utilisateur
      console.log("👤 Création de l'utilisateur:", { email, firstName, lastName })
      targetUser = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          password: hashedPassword,
          status: "ACTIVE"
        }
      })
      console.log("✅ Utilisateur créé:", targetUser.id)
    }

    // Vérifier que les rôles existent et appartiennent au magasin
    console.log("🔍 Vérification des rôles:", roles, "pour le magasin:", storeId)
    const storeRoles = await prisma.storeRole.findMany({
      where: {
        id: { in: roles },
        storeId
      }
    })
    console.log("📋 Rôles trouvés:", storeRoles.length, "sur", roles.length)

    if (storeRoles.length !== roles.length) {
      console.log("❌ Rôles manquants")
      return NextResponse.json(
        { error: "Un ou plusieurs rôles n'existent pas dans ce magasin" },
        { status: 400 }
      )
    }
    console.log("✅ Tous les rôles existent")

    // Assigner les rôles à l'utilisateur dans ce magasin
    console.log("🔗 Assignation des rôles à l'utilisateur:", targetUser.id)
    await prisma.storeUserRole.createMany({
      data: roles.map((roleId: string) => ({
        userId: targetUser.id,
        storeId,
        roleId,
        assignedBy: session.user.id
      }))
    })
    console.log("✅ Rôles assignés avec succès")

    // Retourner l'utilisateur avec ses rôles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: targetUser.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        image: true,
        status: true,
        createdAt: true
      }
    })

    return NextResponse.json(userWithRoles, { status: 201 })
  } catch (error) {
    console.error("Error creating/assigning user to store:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id]/users - Retirer un utilisateur du magasin (userId dans le body)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Vérifier que l'utilisateur existe et est assigné à ce magasin
    const storeUserRoles = await prisma.storeUserRole.findMany({
      where: {
        userId,
        storeId
      }
    })

    if (storeUserRoles.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé dans ce magasin" },
        { status: 404 }
      )
    }

    // Supprimer toutes les assignations de rôles de cet utilisateur dans ce magasin
    await prisma.storeUserRole.deleteMany({
      where: {
        userId,
        storeId
      }
    })

    return NextResponse.json({ message: "Utilisateur retiré du magasin avec succès" })
  } catch (error) {
    console.error("Error removing user from store:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
