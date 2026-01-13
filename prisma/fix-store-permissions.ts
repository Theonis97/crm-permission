
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Fixing store permissions for Mme SOLDE...")

  // 1. Trouver le magasin Mme SOLDE
  const stores = await prisma.store.findMany({
    where: { name: { contains: "SOLDE", mode: "insensitive" } },
    include: {
        manager: true
    }
  })

  if (stores.length === 0) {
    console.error("Store Mme SOLDE not found")
    return
  }

  const store = stores[0]
  console.log(`Found store: ${store.name} (${store.id})`)

  // 2. Créer ou récupérer le rôle Manager
  let managerRole = await prisma.storeRole.findFirst({
    where: {
      storeId: store.id,
      name: "Manager"
    }
  })

  if (!managerRole) {
    console.log("Creating Manager role...")
    managerRole = await prisma.storeRole.create({
      data: {
        name: "Manager",
        description: "Manager du magasin",
        storeId: store.id,
        isSystem: true
      }
    })
  } else {
      console.log("Manager role already exists.")
  }

  // 3. Assigner toutes les permissions 'store.expenses.*' au rôle Manager
  const expensePermissions = await prisma.storePermission.findMany({
    where: {
      name: { startsWith: "store.expenses." }
    }
  })

  console.log(`Found ${expensePermissions.length} expense permissions to assign.`)

  for (const perm of expensePermissions) {
    try {
      await prisma.storeRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: perm.id
          }
        },
        create: {
          roleId: managerRole.id,
          permissionId: perm.id
        },
        update: {}
      })
      console.log(`  Assigned ${perm.name}`)
    } catch (e) {
      console.error(`  Error assigning ${perm.name}:`, e)
    }
  }

  // 4. Assigner le rôle Manager à l'utilisateur actuel (si connu, ou au manager du store)
  // On va assigner au manager du store s'il existe
  if (store.managerId) {
      console.log(`Assigning Manager role to store manager: ${store.manager?.email} (${store.managerId})`)
      try {
        await prisma.storeUserRole.upsert({
            where: {
                userId_storeId_roleId: {
                    userId: store.managerId,
                    storeId: store.id,
                    roleId: managerRole.id
                }
            },
            create: {
                userId: store.managerId,
                storeId: store.id,
                roleId: managerRole.id,
                assignedBy: store.managerId // Auto-assigné pour le fix
            },
            update: {}
        })
        console.log("  Role assigned successfully.")
      } catch (e) {
          console.error("  Error assigning user role:", e)
      }
  } else {
      console.warn("Store has no manager assigned. Cannot assign role to user.")
      // On va essayer de trouver un utilisateur admin pour lui assigner
      const admin = await prisma.user.findFirst({
          where: { email: "admin@example.com" } // Email par défaut souvent utilisé
      })
      if (admin) {
          console.log(`Assigning to fallback admin: ${admin.email}`)
           await prisma.storeUserRole.upsert({
            where: {
                userId_storeId_roleId: {
                    userId: admin.id,
                    storeId: store.id,
                    roleId: managerRole.id
                }
            },
            create: {
                userId: admin.id,
                storeId: store.id,
                roleId: managerRole.id,
                assignedBy: admin.id
            },
            update: {}
        })
      }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
