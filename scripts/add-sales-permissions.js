import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addSalesPermissions() {
  console.log("🔐 Ajout des permissions pour le module de ventes...")

  try {
    // Permissions pour les devis
    const quotePermissions = [
      { name: "quotes.view", description: "Voir les devis" },
      { name: "quotes.create", description: "Créer des devis" },
      { name: "quotes.edit", description: "Modifier les devis" },
      { name: "quotes.delete", description: "Supprimer les devis" },
      { name: "quotes.send", description: "Envoyer les devis" },
    ]

    // Permissions pour les factures
    const invoicePermissions = [
      { name: "invoices.view", description: "Voir les factures" },
      { name: "invoices.create", description: "Créer des factures" },
      { name: "invoices.edit", description: "Modifier les factures" },
      { name: "invoices.delete", description: "Supprimer les factures" },
      { name: "invoices.send", description: "Envoyer les factures" },
    ]

    const allPermissions = [...quotePermissions, ...invoicePermissions]

    // Créer les permissions
    for (const permission of allPermissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: permission,
      })
      console.log(`✅ Permission créée: ${permission.name}`)
    }

    // Assigner toutes les permissions au rôle Admin
    const adminRole = await prisma.role.findUnique({
      where: { name: "Admin" },
    })

    if (adminRole) {
      for (const permission of allPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permission.name },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: adminRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: adminRole.id,
              permissionId: perm.id,
            },
          })
        }
      }
      console.log("✅ Permissions assignées au rôle Admin")
    }

    // Assigner les permissions de lecture au rôle Manager
    const managerRole = await prisma.role.findUnique({
      where: { name: "Manager" },
    })

    if (managerRole) {
      const managerPermissions = [
        "quotes.view",
        "quotes.create",
        "quotes.edit",
        "quotes.send",
        "invoices.view",
        "invoices.create",
        "invoices.edit",
        "invoices.send",
      ]

      for (const permName of managerPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permName },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: managerRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: managerRole.id,
              permissionId: perm.id,
            },
          })
        }
      }
      console.log("✅ Permissions assignées au rôle Manager")
    }

    // Assigner les permissions de lecture au rôle Vendeur
    const salesRole = await prisma.role.findUnique({
      where: { name: "Vendeur" },
    })

    if (salesRole) {
      const salesPermissions = ["quotes.view", "quotes.create", "quotes.edit", "invoices.view", "invoices.create"]

      for (const permName of salesPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permName },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: salesRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: salesRole.id,
              permissionId: perm.id,
            },
          })
        }
      }
      console.log("✅ Permissions assignées au rôle Vendeur")
    }

    console.log("🎉 Permissions de ventes ajoutées avec succès!")
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addSalesPermissions()
