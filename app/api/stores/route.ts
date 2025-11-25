import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Fonction pour initialiser les permissions et rôles d'un magasin
async function initializeStorePermissions(tx: any, storeId: string, creatorUserId: string) {
  // Permissions par défaut pour les magasins
  const STORE_PERMISSIONS = [
    'store.dashboard.view', 'store.products.view', 'store.products.create', 'store.products.edit', 
    'store.products.delete', 'store.products.stock', 'store.categories.view', 'store.categories.manage',
    'store.brands.view', 'store.brands.manage', 'store.orders.view', 'store.orders.create',
    'store.orders.edit', 'store.orders.cancel', 'store.orders.fulfill', 'store.pos.access',
    'store.pos.sell', 'store.pos.refund', 'store.contacts.view', 'store.contacts.create',
    'store.contacts.edit', 'store.contacts.delete', 'store.drivers.view', 'store.drivers.manage',
    'store.drivers.assign', 'store.zones.view', 'store.zones.manage', 'store.movements.view',
    'store.movements.create', 'store.users.view', 'store.users.invite', 'store.users.roles',
    'store.settings.edit'
  ]

  // 1. Vérifier si le rôle Manager existe déjà pour ce magasin
  let managerRole = await tx.storeRole.findUnique({
    where: { 
      name_storeId: { 
        name: 'Manager', 
        storeId 
      } 
    }
  })

  // 2. Si le rôle n'existe pas, le créer avec toutes les permissions
  if (!managerRole) {
    managerRole = await tx.storeRole.create({
      data: {
        name: 'Manager',
        description: 'Accès complet au magasin - Créateur du magasin',
        storeId,
        isSystem: true
      }
    })

    // Récupérer ou créer les permissions et les assigner au rôle
    const existingPermissions = await tx.storePermission.findMany({
      where: {
        name: { in: STORE_PERMISSIONS }
      }
    })

    const existingPermissionNames = existingPermissions.map((p: any) => p.name)
    const missingPermissions = STORE_PERMISSIONS.filter(name => !existingPermissionNames.includes(name))

    // Créer les permissions manquantes en batch
    if (missingPermissions.length > 0) {
      const permissionsToCreate = missingPermissions.map(name => ({
        name,
        description: `Permission ${name}`,
        module: name.split('.')[1] || 'general',
        action: name.split('.')[2] || 'access'
      }))

      await tx.storePermission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true
      })
    }

    // Récupérer toutes les permissions maintenant
    const allPermissions = await tx.storePermission.findMany({
      where: {
        name: { in: STORE_PERMISSIONS }
      }
    })

    // Assigner toutes les permissions au rôle en batch
    const rolePermissions = allPermissions.map((permission: any) => ({
      roleId: managerRole.id,
      permissionId: permission.id
    }))

    await tx.storeRolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true
    })
  }

  // 3. Assigner le rôle Manager à l'utilisateur créateur (si pas déjà assigné)
  const existingAssignment = await tx.storeUserRole.findUnique({
    where: {
      userId_storeId_roleId: {
        userId: creatorUserId,
        storeId,
        roleId: managerRole.id
      }
    }
  })

  if (!existingAssignment) {
    await tx.storeUserRole.create({
      data: {
        userId: creatorUserId,
        storeId,
        roleId: managerRole.id,
        assignedBy: creatorUserId
      }
    })
  }
}

// GET - Liste tous les magasins
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const stores = await prisma.store.findMany({
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching stores:", error)
    return NextResponse.json({ message: "Erreur lors de la récupération des magasins" }, { status: 500 })
  }
}

// POST - Créer un nouveau magasin
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await req.json()
    const { name, logo, coverImage, address, phone, email, whatsapp, managerId } = body

    // Validation
    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Le nom du magasin est requis" }, { status: 400 })
    }

    // Créer le magasin dans une transaction pour assurer la cohérence
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le magasin
      const store = await tx.store.create({
        data: {
          name: name.trim(),
          logo: logo?.trim() || null,
          coverImage: coverImage?.trim() || null,
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          whatsapp: whatsapp?.trim() || null,
          managerId: managerId || null,
        },
        include: {
          manager: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      })

      // 2. Initialiser les permissions et rôles pour le magasin
      await initializeStorePermissions(tx, store.id, session.user.id)

      return store
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating store:", error)
    return NextResponse.json({ message: "Erreur lors de la création du magasin" }, { status: 500 })
  }
}
