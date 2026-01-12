import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Début du seed...")

  try {
    // Nettoyer les données existantes dans l'ordre correct
    console.log("🧹 Nettoyage des données existantes...")
    await prisma.rolePermission.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.stockMovement.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()

    // 1. Créer les rôles
    console.log("🎭 Création des rôles...")
    const roles = await Promise.all([
      prisma.role.create({
        data: {
          name: "Super Admin",
          description: "Accès complet à toutes les fonctionnalités",
          isSystem: true,
        },
      }),
      prisma.role.create({
        data: {
          name: "Admin",
          description: "Accès administrateur avec quelques restrictions",
          isSystem: true,
        },
      }),
      prisma.role.create({
        data: {
          name: "Manager",
          description: "Gestionnaire avec accès aux équipes",
          isSystem: false,
        },
      }),
      prisma.role.create({
        data: {
          name: "Commercial",
          description: "Accès aux fonctionnalités commerciales",
          isSystem: false,
        },
      }),
      prisma.role.create({
        data: {
          name: "Utilisateur",
          description: "Accès de base en lecture",
          isSystem: false,
        },
      }),
    ])

    console.log(`✅ ${roles.length} rôles créés`)

    // 2. Créer les permissions
    console.log("🔐 Création des permissions...")
    const permissionsData = [
      // Users management
      { name: "users.view", description: "Voir les utilisateurs", module: "users", action: "view" },
      { name: "users.create", description: "Créer des utilisateurs", module: "users", action: "create" },
      { name: "users.edit", description: "Modifier les utilisateurs", module: "users", action: "edit" },
      { name: "users.delete", description: "Supprimer les utilisateurs", module: "users", action: "delete" },

      // Roles management
      { name: "roles.view", description: "Voir les rôles", module: "roles", action: "view" },
      { name: "roles.create", description: "Créer des rôles", module: "roles", action: "create" },
      { name: "roles.edit", description: "Modifier les rôles", module: "roles", action: "edit" },
      { name: "roles.delete", description: "Supprimer les rôles", module: "roles", action: "delete" },
      { name: "roles.assign", description: "Assigner des rôles", module: "roles", action: "assign" },

      // Contacts management
      { name: "contacts.view", description: "Voir les contacts", module: "contacts", action: "view" },
      { name: "contacts.create", description: "Créer des contacts", module: "contacts", action: "create" },
      { name: "contacts.edit", description: "Modifier les contacts", module: "contacts", action: "edit" },
      { name: "contacts.delete", description: "Supprimer les contacts", module: "contacts", action: "delete" },
      { name: "contacts.export", description: "Exporter les contacts", module: "contacts", action: "export" },

      // Products management
      { name: "products.view", description: "Voir les produits", module: "products", action: "view" },
      { name: "products.create", description: "Créer des produits", module: "products", action: "create" },
      { name: "products.edit", description: "Modifier les produits", module: "products", action: "edit" },
      { name: "products.delete", description: "Supprimer les produits", module: "products", action: "delete" },

      // Quotes management
      { name: "quotes.view", description: "Voir les devis", module: "quotes", action: "view" },
      { name: "quotes.create", description: "Créer des devis", module: "quotes", action: "create" },
      { name: "quotes.edit", description: "Modifier les devis", module: "quotes", action: "edit" },
      { name: "quotes.delete", description: "Supprimer les devis", module: "quotes", action: "delete" },
      { name: "quotes.send", description: "Envoyer des devis", module: "quotes", action: "send" },

      // Invoices management
      { name: "invoices.view", description: "Voir les factures", module: "invoices", action: "view" },
      { name: "invoices.create", description: "Créer des factures", module: "invoices", action: "create" },
      { name: "invoices.edit", description: "Modifier les factures", module: "invoices", action: "edit" },
      { name: "invoices.delete", description: "Supprimer les factures", module: "invoices", action: "delete" },
      { name: "invoices.send", description: "Envoyer des factures", module: "invoices", action: "send" },

      // Tasks management
      { name: "tasks.view", description: "Voir les tâches", module: "tasks", action: "view" },
      { name: "tasks.create", description: "Créer des tâches", module: "tasks", action: "create" },
      { name: "tasks.edit", description: "Modifier les tâches", module: "tasks", action: "edit" },
      { name: "tasks.delete", description: "Supprimer les tâches", module: "tasks", action: "delete" },
      { name: "tasks.assign", description: "Assigner des tâches", module: "tasks", action: "assign" },

      // Opportunities management
      { name: "opportunities.view", description: "Voir les opportunités", module: "opportunities", action: "view" },
      {
        name: "opportunities.create",
        description: "Créer des opportunités",
        module: "opportunities",
        action: "create",
      },
      { name: "opportunities.edit", description: "Modifier les opportunités", module: "opportunities", action: "edit" },
      {
        name: "opportunities.delete",
        description: "Supprimer les opportunités",
        module: "opportunities",
        action: "delete",
      },

      // Reports management
      { name: "reports.view", description: "Voir les rapports", module: "reports", action: "view" },
      { name: "reports.export", description: "Exporter les rapports", module: "reports", action: "export" },

      // Warehouses management (Entrepôts)
      { name: "warehouses.view", description: "Voir les entrepôts", module: "warehouses", action: "view" },
      { name: "warehouses.create", description: "Créer des entrepôts", module: "warehouses", action: "create" },
      { name: "warehouses.edit", description: "Modifier les entrepôts", module: "warehouses", action: "edit" },
      { name: "warehouses.delete", description: "Supprimer les entrepôts", module: "warehouses", action: "delete" },
      {
        name: "warehouses.manage_stock",
        description: "Gérer les stocks dans les entrepôts",
        module: "warehouses",
        action: "manage_stock",
      },
      {
        name: "warehouses.transfer",
        description: "Transférer des stocks entre entrepôts",
        module: "warehouses",
        action: "transfer",
      },
      {
        name: "warehouses.inventory",
        description: "Faire l'inventaire des entrepôts",
        module: "warehouses",
        action: "inventory",
      },
      { name: "warehouses.export", description: "Exporter les données d'entrepôt", module: "warehouses", action: "export" },

      // Warehouse Orders management (Commandes magasins vers entrepôt)
      { name: "warehouse.orders.view", description: "Voir les commandes d'entrepôt", module: "warehouse", action: "view" },
      { name: "warehouse.orders.create", description: "Créer des commandes d'entrepôt", module: "warehouse", action: "create" },
      { name: "warehouse.orders.update", description: "Modifier les commandes d'entrepôt", module: "warehouse", action: "update" },
      { name: "warehouse.orders.delete", description: "Supprimer les commandes d'entrepôt", module: "warehouse", action: "delete" },
      { name: "warehouse.orders.validate", description: "Valider les commandes d'entrepôt", module: "warehouse", action: "validate" },
      { name: "warehouse.orders.approve", description: "Approuver les commandes d'entrepôt", module: "warehouse", action: "approve" },

      // Stores management (Magasins)
      { name: "stores.view", description: "Voir les magasins", module: "stores", action: "view" },
      { name: "stores.create", description: "Créer des magasins", module: "stores", action: "create" },
      { name: "stores.edit", description: "Modifier les magasins", module: "stores", action: "edit" },
      { name: "stores.delete", description: "Supprimer les magasins", module: "stores", action: "delete" },
      {
        name: "stores.assign_manager",
        description: "Assigner un gestionnaire au magasin",
        module: "stores",
        action: "assign_manager",
      },
      {
        name: "stores.manage_inventory",
        description: "Gérer l'inventaire du magasin",
        module: "stores",
        action: "manage_inventory",
      },
      { name: "stores.view_sales", description: "Voir les ventes du magasin", module: "stores", action: "view_sales" },
      { name: "stores.export", description: "Exporter les données du magasin", module: "stores", action: "export" },

      // Store Orders management (Commandes clients)
      { name: "orders.view", description: "Voir les commandes clients", module: "orders", action: "view" },
      { name: "orders.create", description: "Créer des commandes clients", module: "orders", action: "create" },
      { name: "orders.edit", description: "Modifier les commandes clients", module: "orders", action: "edit" },
      { name: "orders.delete", description: "Supprimer les commandes clients", module: "orders", action: "delete" },
      { name: "orders.validate", description: "Valider les commandes clients", module: "orders", action: "validate" },
      { name: "orders.cancel", description: "Annuler les commandes clients", module: "orders", action: "cancel" },

      // Attendance management (Pointage)
      { name: "attendance.view", description: "Voir les pointages", module: "attendance", action: "view" },
      { name: "attendance.create", description: "Créer des pointages", module: "attendance", action: "create" },
      { name: "attendance.edit", description: "Modifier les pointages", module: "attendance", action: "edit" },
      { name: "attendance.delete", description: "Supprimer les pointages", module: "attendance", action: "delete" },
      { name: "attendance.export", description: "Exporter les pointages", module: "attendance", action: "export" },
      { name: "attendance.manage", description: "Gérer les paramètres de pointage", module: "attendance", action: "manage" },

      // Accounting management (Comptabilité)
      { name: "accounting.view", description: "Voir la comptabilité", module: "accounting", action: "view" },
      { name: "accounting.dashboard", description: "Voir le tableau de bord comptable", module: "accounting", action: "dashboard" },
      { name: "accounting.expenses.view", description: "Voir les dépenses", module: "accounting", action: "view" },
      { name: "accounting.expenses.create", description: "Créer des dépenses", module: "accounting", action: "create" },
      { name: "accounting.expenses.edit", description: "Modifier les dépenses", module: "accounting", action: "edit" },
      { name: "accounting.expenses.delete", description: "Supprimer les dépenses", module: "accounting", action: "delete" },
      { name: "accounting.expenses.pay", description: "Enregistrer des paiements", module: "accounting", action: "pay" },
      { name: "accounting.categories.view", description: "Voir les catégories de dépenses", module: "accounting", action: "view" },
      { name: "accounting.categories.manage", description: "Gérer les catégories de dépenses", module: "accounting", action: "manage" },
      { name: "accounting.reports.view", description: "Voir les rapports comptables", module: "accounting", action: "view" },
      { name: "accounting.reports.export", description: "Exporter les rapports comptables", module: "accounting", action: "export" },
    ]

    const permissions = await Promise.all(
      permissionsData.map((permission) =>
        prisma.permission.create({
          data: permission,
        }),
      ),
    )

    console.log(`✅ ${permissions.length} permissions créées`)

    // 3. Assigner les permissions aux rôles
    console.log("🔗 Attribution des permissions aux rôles...")

    const [superAdminRole, adminRole, managerRole, commercialRole, userRole] = roles

    // Super Admin : toutes les permissions
    await Promise.all(
      permissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    )
    console.log(`✅ Super Admin: ${permissions.length} permissions`)

    // Admin : toutes sauf users.delete et gestion des rôles
    const adminPermissions = permissions.filter(
      (p) => !["users.delete", "roles.create", "roles.edit", "roles.delete"].includes(p.name),
    )
    await Promise.all(
      adminPermissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    )
    console.log(`✅ Admin: ${adminPermissions.length} permissions`)

    // Manager : modules commerciaux sans delete
    const managerPermissions = permissions.filter(
      (p) =>
        ["contacts", "products", "quotes", "invoices", "tasks", "opportunities", "reports", "warehouses", "warehouse", "stores", "orders", "attendance"].includes(p.module) &&
        p.action !== "delete",
    )
    await Promise.all(
      managerPermissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: managerRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    )
    console.log(`✅ Manager: ${managerPermissions.length} permissions`)

    // Commercial : permissions de base
    const commercialPermissions = permissions.filter(
      (p) =>
        ["contacts", "products", "quotes", "tasks", "opportunities", "stores", "orders", "attendance"].includes(p.module) &&
        (["view", "create", "edit"].includes(p.action) || p.name === "stores.view_sales"),
    )
    await Promise.all(
      commercialPermissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: commercialRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    )
    console.log(`✅ Commercial: ${commercialPermissions.length} permissions`)

    // Utilisateur : lecture seule
    const userPermissions = permissions.filter((p) => p.action === "view")
    await Promise.all(
      userPermissions.map((permission) =>
        prisma.rolePermission.create({
          data: {
            roleId: userRole.id,
            permissionId: permission.id,
          },
        }),
      ),
    )
    console.log(`✅ Utilisateur: ${userPermissions.length} permissions`)

    // 4. Créer les utilisateurs avec mots de passe
    console.log("👤 Création des utilisateurs...")
    const hashedPassword = await bcrypt.hash("password", 12)

    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: "admin@example.com",
          firstName: "Super",
          lastName: "Admin",
          name: "Super Admin",
          password: hashedPassword,
          status: "ACTIVE",
        },
      }),
      prisma.user.create({
        data: {
          email: "manager@example.com",
          firstName: "John",
          lastName: "Manager",
          name: "John Manager",
          password: hashedPassword,
          status: "ACTIVE",
        },
      }),
      prisma.user.create({
        data: {
          email: "commercial@example.com",
          firstName: "Jane",
          lastName: "Commercial",
          name: "Jane Commercial",
          password: hashedPassword,
          status: "ACTIVE",
        },
      }),
      prisma.user.create({
        data: {
          email: "user@example.com",
          firstName: "Basic",
          lastName: "User",
          name: "Basic User",
          password: hashedPassword,
          status: "ACTIVE",
        },
      }),
    ])

    console.log(`✅ ${users.length} utilisateurs créés`)

    // 5. Assigner les rôles aux utilisateurs
    console.log("🎭 Attribution des rôles aux utilisateurs...")
    const [adminUser, managerUser, commercialUser, basicUser] = users

    await Promise.all([
      prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      }),
      prisma.userRole.create({
        data: {
          userId: managerUser.id,
          roleId: managerRole.id,
        },
      }),
      prisma.userRole.create({
        data: {
          userId: commercialUser.id,
          roleId: commercialRole.id,
        },
      }),
      prisma.userRole.create({
        data: {
          userId: basicUser.id,
          roleId: userRole.id,
        },
      }),
    ])

    console.log("✅ Rôles assignés aux utilisateurs")

    // 6. Créer les catégories de dépenses par défaut
    console.log("💰 Création des catégories de dépenses...")
    const expenseCategoriesData = [
      { name: "Achat Fournisseur", description: "Achats auprès des fournisseurs", icon: "Package", color: "#3B82F6", isSystem: true },
      { name: "Salaire", description: "Salaires des employés", icon: "Users", color: "#10B981", isSystem: true },
      { name: "Transport", description: "Frais de transport et déplacement", icon: "Truck", color: "#F59E0B", isSystem: true },
      { name: "Internet", description: "Abonnement internet", icon: "Wifi", color: "#8B5CF6", isSystem: true },
      { name: "Loyer", description: "Loyer des locaux", icon: "Home", color: "#EF4444", isSystem: true },
      { name: "Électricité", description: "Factures d'électricité", icon: "Zap", color: "#F97316", isSystem: true },
      { name: "Eau", description: "Factures d'eau", icon: "Droplet", color: "#06B6D4", isSystem: true },
      { name: "Prestation", description: "Prestations de services", icon: "Briefcase", color: "#6366F1", isSystem: true },
      { name: "Impôts & Taxes", description: "Impôts et taxes diverses", icon: "FileText", color: "#DC2626", isSystem: true },
      { name: "Assurance", description: "Assurances diverses", icon: "Shield", color: "#059669", isSystem: true },
      { name: "Autre", description: "Autres dépenses", icon: "MoreHorizontal", color: "#6B7280", isSystem: true },
    ]

    const expenseCategories = await Promise.all(
      expenseCategoriesData.map((category) =>
        prisma.expenseCategory.create({
          data: category,
        }),
      ),
    )

    console.log(`✅ ${expenseCategories.length} catégories de dépenses créées`)

    // 7. Vérification finale
    console.log("\n📊 Résumé de la création:")
    const counts = {
      roles: await prisma.role.count(),
      permissions: await prisma.permission.count(),
      users: await prisma.user.count(),
      userRoles: await prisma.userRole.count(),
      rolePermissions: await prisma.rolePermission.count(),
    }

    console.log(`   Rôles: ${counts.roles}`)
    console.log(`   Permissions: ${counts.permissions}`)
    console.log(`   Utilisateurs: ${counts.users}`)
    console.log(`   Assignations utilisateur-rôle: ${counts.userRoles}`)
    console.log(`   Assignations rôle-permission: ${counts.rolePermissions}`)

    console.log("\n🎉 Seed terminé avec succès!")
    console.log("\n📧 Comptes créés:")
    console.log("   admin@example.com (Super Admin)")
    console.log("   manager@example.com (Manager)")
    console.log("   commercial@example.com (Commercial)")
    console.log("   user@example.com (Utilisateur)")
    console.log("   Mot de passe pour tous: password")
  } catch (error) {
    console.error("❌ Erreur lors du seed:", error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
