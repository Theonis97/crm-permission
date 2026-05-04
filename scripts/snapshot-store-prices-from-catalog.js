/**
 * Copie une fois les prix catalogue sur les lignes store_products où prix_vente est NULL,
 * pour que les magasins ne suivent plus automatiquement les changements d'entrepôt.
 *
 * Usage : depuis crm-permissions : node scripts/snapshot-store-prices-from-catalog.js
 */
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.storeProduct.findMany({
    where: { prixVente: null },
    include: { product: { select: { id: true, prixVente: true, prixAchat: true } } },
  })

  let n = 0
  for (const sp of rows) {
    await prisma.storeProduct.update({
      where: { id: sp.id },
      data: {
        prixVente: sp.product.prixVente,
        prixAchat: sp.product.prixAchat,
      },
    })
    n++
  }

  console.log(`Mis à jour ${n} ligne(s) store_products (prix copiés depuis le catalogue).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
