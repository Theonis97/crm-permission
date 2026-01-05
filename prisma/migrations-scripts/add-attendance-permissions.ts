import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addAttendancePermissions() {
  console.log("🕐 Ajout des permissions de pointage...")

  try {
    // 1. Créer les permissions de pointage
    const attendancePermissions = [
      { name: "attendance.view", description: "Voir les pointages", module: "attendance", action: "view" },
      { name: "attendance.create", description: "Créer des pointages", module: "attendance", action: "create" },
      { name: "attendance.edit", description: "Modifier les pointages", module: "attendance", action: "edit" },
      { name: "attendance.delete", description: "Supprimer les pointages", module: "attendance", action: "delete" },
      { name: "attendance.export", description: "Exporter les pointages", module: "attendance", action: "export" },
      { name: "attendance.manage", description: "Gérer les paramètres de pointage", module: "attendance", action: "manage" },
    ]

    const createdPermissions = []

    for (const permData of attendancePermissions) {
      // Vérifier si la permission existe déjà
      const existing = await prisma.permission.findUnique({
        where: { name: permData.name },
      })

      if (existing) {
        console.log(`   ⏭️  Permission "${permData.name}" existe déjà`)
        createdPermissions.push(existing)
      } else {
        const created = await prisma.permission.create({
          data: permData,
        })
        console.log(`   ✅ Permission "${permData.name}" créée`)
        createdPermissions.push(created)
      }
    }

    // 2. Récupérer les rôles existants
    const superAdminRole = await prisma.role.findFirst({ where: { name: "Super Admin" } })
    const adminRole = await prisma.role.findFirst({ where: { name: "Admin" } })
    const managerRole = await prisma.role.findFirst({ where: { name: "Manager" } })
    const commercialRole = await prisma.role.findFirst({ where: { name: "Commercial" } })
    const userRole = await prisma.role.findFirst({ where: { name: "Utilisateur" } })

    // 3. Assigner les permissions aux rôles
    console.log("\n🔗 Attribution des permissions aux rôles...")

    // Super Admin : toutes les permissions de pointage
    if (superAdminRole) {
      for (const perm of createdPermissions) {
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: superAdminRole.id, permissionId: perm.id },
        })
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: superAdminRole.id, permissionId: perm.id },
          })
        }
      }
      console.log(`   ✅ Super Admin: ${createdPermissions.length} permissions de pointage`)
    }

    // Admin : toutes sauf delete
    if (adminRole) {
      const adminPerms = createdPermissions.filter((p) => p.action !== "delete")
      for (const perm of adminPerms) {
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: adminRole.id, permissionId: perm.id },
        })
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: adminRole.id, permissionId: perm.id },
          })
        }
      }
      console.log(`   ✅ Admin: ${adminPerms.length} permissions de pointage`)
    }

    // Manager : view, create, edit, export
    if (managerRole) {
      const managerPerms = createdPermissions.filter((p) =>
        ["view", "create", "edit", "export"].includes(p.action)
      )
      for (const perm of managerPerms) {
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: managerRole.id, permissionId: perm.id },
        })
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: managerRole.id, permissionId: perm.id },
          })
        }
      }
      console.log(`   ✅ Manager: ${managerPerms.length} permissions de pointage`)
    }

    // Commercial : view, create (peut pointer)
    if (commercialRole) {
      const commercialPerms = createdPermissions.filter((p) =>
        ["view", "create"].includes(p.action)
      )
      for (const perm of commercialPerms) {
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: commercialRole.id, permissionId: perm.id },
        })
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: commercialRole.id, permissionId: perm.id },
          })
        }
      }
      console.log(`   ✅ Commercial: ${commercialPerms.length} permissions de pointage`)
    }

    // Utilisateur : view, create (peut pointer et voir ses propres pointages)
    if (userRole) {
      const userPerms = createdPermissions.filter((p) =>
        ["view", "create"].includes(p.action)
      )
      for (const perm of userPerms) {
        const existing = await prisma.rolePermission.findFirst({
          where: { roleId: userRole.id, permissionId: perm.id },
        })
        if (!existing) {
          await prisma.rolePermission.create({
            data: { roleId: userRole.id, permissionId: perm.id },
          })
        }
      }
      console.log(`   ✅ Utilisateur: ${userPerms.length} permissions de pointage`)
    }

    console.log("\n🎉 Permissions de pointage ajoutées avec succès!")

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions:", error)
    throw error
  }
}

addAttendancePermissions()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
