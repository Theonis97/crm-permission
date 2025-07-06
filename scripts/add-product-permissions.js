import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addProductPermissions() {
  try {
    console.log("🔧 Ajout des permissions produits...")

    // Permissions produits à créer
    const productPermissions = [
      { name: "products.view", description: "Voir les produits", module: "products", action: "view" },
      { name: "products.create", description: "Créer des produits", module: "products", action: "create" },
      { name: "products.edit", description: "Modifier les produits", module: "products", action: "edit" },
      { name: "products.delete", description: "Supprimer les produits", module: "products", action: "delete" },
    ]

    // Créer les permissions si elles n'existent pas
    for (const permData of productPermissions) {
      const existing = await prisma.permission.findUnique({
        where: { name: permData.name },
      })

      if (!existing) {
        const permission = await prisma.permission.create({
          data: permData,
        })
        console.log(`✅ Permission créée: ${permission.name}`)
      } else {
        console.log(`ℹ️ Permission existe déjà: ${permData.name}`)
      }
    }

    // Assigner toutes les permissions produits au rôle ADMIN
    const adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
    })

    if (adminRole) {
      const allProductPermissions = await prisma.permission.findMany({
        where: {
          name: {
            startsWith: "products.",
          },
        },
      })

      for (const permission of allProductPermissions) {
        const existing = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          },
        })

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          })
          console.log(`✅ Permission ${permission.name} assignée au rôle ADMIN`)
        } else {
          console.log(`ℹ️ Permission ${permission.name} déjà assignée au rôle ADMIN`)
        }
      }
    } else {
      console.log("❌ Rôle ADMIN non trouvé")
    }

    console.log("✅ Permissions produits configurées avec succès!")
  } catch (error) {
    console.error("❌ Erreur:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addProductPermissions()
