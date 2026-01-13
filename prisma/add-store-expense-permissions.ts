
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Start adding store expense permissions...")

  const NEW_PERMISSIONS = [
    { name: 'store.expenses.view', description: 'Voir les dépenses du magasin', module: 'expenses', action: 'view' },
    { name: 'store.expenses.create', description: 'Créer des dépenses pour le magasin', module: 'expenses', action: 'create' },
    { name: 'store.expenses.edit', description: 'Modifier les dépenses du magasin', module: 'expenses', action: 'edit' },
    { name: 'store.expenses.delete', description: 'Supprimer les dépenses du magasin', module: 'expenses', action: 'delete' },
    { name: 'store.expenses.approve', description: 'Approuver/Payer les dépenses du magasin', module: 'expenses', action: 'approve' },
  ]

  // 1. Récupérer tous les magasins
  const stores = await prisma.store.findMany({
    include: {
      storeRoles: {
        where: { name: 'Manager' } // On cible le rôle Manager par défaut
      }
    }
  })

  console.log(`Found ${stores.length} stores.`)

  for (const store of stores) {
    console.log(`Processing store: ${store.name} (${store.id})`)
    
    // Créer les permissions pour ce magasin si elles n'existent pas (StorePermission est global en définition mais lié au StoreRolePermission)
    // ATTENTION: Le modèle StorePermission est global (pas de storeId), c'est StoreRolePermission qui fait le lien via StoreRole.
    // Vérifions le schéma : StorePermission a juste name, description, module, action. Il est UNIQUE par name.
    // Donc on ne crée les permissions qu'une seule fois globalement, pas par magasin.
    // Ah non, StorePermission est global.
    
    // Créons les permissions manquantes globalement
    for (const perm of NEW_PERMISSIONS) {
      await prisma.storePermission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm
      })
    }
    
    // Maintenant on assigne au rôle Manager du magasin
    const managerRole = store.storeRoles[0]
    if (!managerRole) {
      console.warn(`  No Manager role found for store ${store.name}`)
      continue
    }

    const permissions = await prisma.storePermission.findMany({
      where: {
        name: { in: NEW_PERMISSIONS.map(p => p.name) }
      }
    })

    for (const perm of permissions) {
      try {
        await prisma.storeRolePermission.create({
          data: {
            roleId: managerRole.id,
            permissionId: perm.id
          }
        })
        console.log(`  Added permission ${perm.name} to Manager role`)
      } catch (e) {
        // Ignore unique constraint violation if already exists
      }
    }
  }

  console.log("Done adding permissions.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
