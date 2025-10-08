import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function showPermissionsMatrix() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗")
  console.log("║        MATRICE DES PERMISSIONS - ERP INTECH                  ║")
  console.log("╚══════════════════════════════════════════════════════════════╝\n")

  try {
    // Récupérer tous les rôles
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Récupérer toutes les permissions groupées par module
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    })

    // Grouper les permissions par module
    const permissionsByModule = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = []
      }
      acc[perm.module].push(perm)
      return acc
    }, {})

    // Icônes par module
    const moduleIcons = {
      users: "👥",
      roles: "🎭",
      contacts: "📇",
      products: "📦",
      warehouses: "🏭",
      stores: "🏪",
      quotes: "📄",
      invoices: "🧾",
      tasks: "✅",
      opportunities: "🎯",
      reports: "📊",
    }

    // Afficher la matrice par module
    for (const [module, perms] of Object.entries(permissionsByModule)) {
      const icon = moduleIcons[module] || "📌"
      console.log(`\n${icon} MODULE: ${module.toUpperCase()}`)
      console.log("═".repeat(80))

      // En-tête du tableau
      const header = `${"Permission".padEnd(35)} | ${roles.map((r) => r.name.padEnd(12)).join(" | ")}`
      console.log(header)
      console.log("-".repeat(80))

      // Afficher chaque permission
      for (const perm of perms) {
        const permName = perm.name.padEnd(35)
        const roleAccess = roles
          .map((role) => {
            const hasAccess = role.rolePermissions.some((rp) => rp.permissionId === perm.id)
            return (hasAccess ? "✓" : "✗").padEnd(12)
          })
          .join(" | ")

        console.log(`${permName} | ${roleAccess}`)
      }
    }

    // Résumé par rôle
    console.log("\n\n╔══════════════════════════════════════════════════════════════╗")
    console.log("║                    RÉSUMÉ PAR RÔLE                           ║")
    console.log("╚══════════════════════════════════════════════════════════════╝\n")

    for (const role of roles) {
      console.log(`\n🛡️  ${role.name.toUpperCase()}`)
      console.log(`   Description: ${role.description}`)
      console.log(`   Système: ${role.isSystem ? "Oui" : "Non"}`)
      console.log(`   Total permissions: ${role.rolePermissions.length}`)

      // Grouper les permissions par module pour ce rôle
      const rolePermsByModule = role.rolePermissions.reduce((acc, rp) => {
        const module = rp.permission.module
        if (!acc[module]) {
          acc[module] = []
        }
        acc[module].push(rp.permission)
        return acc
      }, {})

      console.log("   Modules:")
      for (const [module, perms] of Object.entries(rolePermsByModule)) {
        const icon = moduleIcons[module] || "📌"
        const actions = perms.map((p) => p.action).join(", ")
        console.log(`      ${icon} ${module}: ${perms.length} permissions (${actions})`)
      }
    }

    // Statistiques globales
    console.log("\n\n╔══════════════════════════════════════════════════════════════╗")
    console.log("║                  STATISTIQUES GLOBALES                       ║")
    console.log("╚══════════════════════════════════════════════════════════════╝\n")

    const stats = {
      totalRoles: await prisma.role.count(),
      totalPermissions: await prisma.permission.count(),
      totalRolePermissions: await prisma.rolePermission.count(),
      totalUsers: await prisma.user.count(),
      totalUserRoles: await prisma.userRole.count(),
    }

    console.log(`   📊 Rôles définis: ${stats.totalRoles}`)
    console.log(`   🔐 Permissions totales: ${stats.totalPermissions}`)
    console.log(`   🔗 Attributions rôle-permission: ${stats.totalRolePermissions}`)
    console.log(`   👤 Utilisateurs: ${stats.totalUsers}`)
    console.log(`   🎭 Attributions utilisateur-rôle: ${stats.totalUserRoles}`)

    // Modules avec leurs nombres de permissions
    console.log("\n   📦 Permissions par module:")
    for (const [module, perms] of Object.entries(permissionsByModule)) {
      const icon = moduleIcons[module] || "📌"
      console.log(`      ${icon} ${module}: ${perms.length} permissions`)
    }

    // Nouveaux modules ajoutés
    console.log("\n   ✨ Modules récemment ajoutés:")
    console.log("      🏭 warehouses: 8 permissions")
    console.log("      🏪 stores: 8 permissions")

    console.log("\n")
  } catch (error) {
    console.error("❌ Erreur:", error)
  } finally {
    await prisma.$disconnect()
  }
}

showPermissionsMatrix()
