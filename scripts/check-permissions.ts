import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function checkPermissions() {
  console.log("🔍 Vérification des permissions de magasin...")

  try {
    // Compter les permissions
    const permissionsCount = await prisma.storePermission.count()
    console.log(`📊 Total permissions: ${permissionsCount}`)

    // Lister quelques permissions
    const permissions = await prisma.storePermission.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        module: true,
        action: true,
      },
      orderBy: {
        module: "asc",
      },
    })

    console.log("\n📋 Exemples de permissions:")
    permissions.forEach((p) => {
      console.log(`   ${p.module}.${p.action} - ${p.name}`)
    })

    // Vérifier les rôles Super Admin
    const superAdminRoles = await prisma.storeRole.findMany({
      where: {
        name: "Super Admin",
      },
      include: {
        store: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            storeRolePermissions: true,
          },
        },
      },
    })

    console.log("\n👑 Rôles Super Admin:")
    superAdminRoles.forEach((role) => {
      console.log(`   ${role.store.name}: ${role._count.storeRolePermissions} permissions`)
    })

  } catch (error) {
    console.error("❌ Erreur:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPermissions()
