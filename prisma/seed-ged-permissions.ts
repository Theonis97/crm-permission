import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const gedPermissions = [
  { name: "ged.view", module: "ged", action: "view", description: "Accéder au module GED" },
  { name: "ged.upload", module: "ged", action: "upload", description: "Importer des fichiers" },
  { name: "ged.download", module: "ged", action: "download", description: "Télécharger des fichiers" },
  { name: "ged.create_folder", module: "ged", action: "create_folder", description: "Créer des dossiers" },
  { name: "ged.edit", module: "ged", action: "edit", description: "Renommer/modifier des fichiers" },
  { name: "ged.delete", module: "ged", action: "delete", description: "Supprimer des fichiers" },
  { name: "ged.share", module: "ged", action: "share", description: "Partager des fichiers" },
  { name: "ged.admin", module: "ged", action: "admin", description: "Administration complète du module GED" },
]

async function seedGedPermissions() {
  console.log("🔐 Création des permissions du module GED...")

  // Créer les permissions
  for (const perm of gedPermissions) {
    const existing = await prisma.permission.findFirst({
      where: { name: perm.name },
    })

    if (!existing) {
      await prisma.permission.create({
        data: {
          name: perm.name,
          module: perm.module,
          action: perm.action,
          description: perm.description,
        },
      })
      console.log(`  ✅ Permission créée: ${perm.name}`)
    } else {
      console.log(`  ⏭️  Permission existe déjà: ${perm.name}`)
    }
  }

  console.log("\n👥 Attribution des permissions aux rôles Super Admin et Admin...")

  // Trouver les rôles Super Admin et Admin
  const superAdminRole = await prisma.role.findFirst({
    where: { name: { contains: "Super Admin", mode: "insensitive" } },
  })

  const adminRole = await prisma.role.findFirst({
    where: { name: { equals: "Admin", mode: "insensitive" } },
  })

  // Récupérer toutes les permissions GED
  const allGedPermissions = await prisma.permission.findMany({
    where: { module: "ged" },
  })

  // Attribuer les permissions aux rôles
  for (const permission of allGedPermissions) {
    // Super Admin
    if (superAdminRole) {
      const existingSuperAdmin = await prisma.rolePermission.findFirst({
        where: { roleId: superAdminRole.id, permissionId: permission.id },
      })
      if (!existingSuperAdmin) {
        await prisma.rolePermission.create({
          data: { roleId: superAdminRole.id, permissionId: permission.id },
        })
        console.log(`  ✅ Permission ${permission.name} attribuée à Super Admin`)
      }
    }

    // Admin
    if (adminRole) {
      const existingAdmin = await prisma.rolePermission.findFirst({
        where: { roleId: adminRole.id, permissionId: permission.id },
      })
      if (!existingAdmin) {
        await prisma.rolePermission.create({
          data: { roleId: adminRole.id, permissionId: permission.id },
        })
        console.log(`  ✅ Permission ${permission.name} attribuée à Admin`)
      }
    }
  }

  console.log("\n✅ Seed des permissions GED terminé!")
}

seedGedPermissions()
  .catch((e) => {
    console.error("Erreur lors du seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
