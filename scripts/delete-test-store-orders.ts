/**
 * Supprime des commandes clients magasin (store_orders) identifiées comme tests,
 * en restaurant le stock magasin et les mouvements « Vente POS … » pour les ventes POS.
 *
 * Usage (depuis la racine crm-permissions, avec DATABASE_URL, fichier .env) :
 *
 *   npm run delete-test-sales -- --dry-run --notes-contains test
 *   npm run delete-test-sales -- --execute --notes-contains test
 *
 * Filtres (au moins un requis) :
 *   --notes-contains <texte>     notes contiennent ce texte (insensible à la casse)
 *   --customer-phone <tel>       téléphone client exact
 *   --numbers <n1,n2,...>        numéros de commande (ex. POS-250421-143022123)
 *
 * Optionnel :
 *   --store-id <id>              limiter à un magasin
 *   --pos-only                   uniquement orderSource = POS (recommandé, défaut: true)
 *   --include-non-pos            autoriser aussi les autres sources (pas de restauration stock auto)
 *   --dry-run                    lister sans supprimer (défaut si --execute absent)
 *   --execute                    effectuer les suppressions
 *
 * Limites :
 *   - Restauration stock / packs / stock_movements : seulement pour orderSource === "POS".
 *   - Les totaux store_contacts (totalOrders, totalSpent) ne sont pas recalculés automatiquement.
 */

import type { Prisma } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
import { adjustPackAssembledForProxyProduct } from "../lib/store-packs"

const prisma = new PrismaClient()

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = { "pos-only": true }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--dry-run") out["dry-run"] = true
    else if (a === "--execute") out.execute = true
    else if (a === "--pos-only") out["pos-only"] = true
    else if (a === "--include-non-pos") {
      out["pos-only"] = false
    } else if (a.startsWith("--")) {
      const key = a.slice(2)
      const v = argv[i + 1]
      if (v && !v.startsWith("--")) {
        out[key] = v
        i++
      } else {
        out[key] = true
      }
    }
  }
  return out as {
    "dry-run"?: boolean
    execute?: boolean
    "pos-only"?: boolean
    "store-id"?: string
    "notes-contains"?: string
    "customer-phone"?: string
    numbers?: string
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const dryRun = !args.execute
  const posOnly = args["pos-only"] !== false

  const notesContains = args["notes-contains"]
  const customerPhone = args["customer-phone"]
  const numbersRaw = args.numbers

  if (!notesContains && !customerPhone && !numbersRaw) {
    console.error(
      "Indiquez au moins un filtre : --notes-contains, --customer-phone ou --numbers (liste séparée par des virgules)."
    )
    process.exit(1)
  }

  const numbers = numbersRaw
    ? numbersRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const whereAnd: Prisma.StoreOrderWhereInput[] = []

  if (args["store-id"]) {
    whereAnd.push({ storeId: args["store-id"] })
  }

  if (posOnly) {
    whereAnd.push({ orderSource: "POS" })
  }

  if (notesContains) {
    whereAnd.push({
      notes: { contains: notesContains, mode: "insensitive" },
    })
  }

  if (customerPhone) {
    whereAnd.push({ customerPhone })
  }

  if (numbers.length > 0) {
    whereAnd.push({ number: { in: numbers } })
  }

  const where: Prisma.StoreOrderWhereInput =
    whereAnd.length > 0 ? { AND: whereAnd } : {}

  const orders = await prisma.storeOrder.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Commandes trouvées : ${orders.length}`)
  for (const o of orders) {
    console.log(
      `  - ${o.number} | ${o.orderSource ?? "?" } | ${o.customerName} | ${o.customerPhone} | ${o.createdAt.toISOString()}`
    )
  }

  if (dryRun) {
    console.log("\nMode dry-run : aucune modification. Ajoutez --execute pour supprimer.")
    await prisma.$disconnect()
    return
  }

  let deleted = 0
  for (const order of orders) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.whatsAppMessage.updateMany({
          where: { storeOrderId: order.id },
          data: { storeOrderId: null },
        })

        const restorePosStock = order.orderSource === "POS"

        if (restorePosStock) {
          for (const item of order.items) {
            if (!item.productId) continue

            const sp = await tx.storeProduct.findUnique({
              where: {
                storeId_productId: {
                  storeId: order.storeId,
                  productId: item.productId,
                },
              },
            })

            if (sp) {
              await tx.storeProduct.update({
                where: { id: sp.id },
                data: { stock: { increment: item.quantity } },
              })
            }

            await adjustPackAssembledForProxyProduct(tx, {
              storeId: order.storeId,
              productId: item.productId,
              deltaPackUnits: item.quantity,
            })
          }

          await tx.stockMovement.deleteMany({
            where: {
              type: "SALE",
              note: { contains: `Vente POS ${order.number}` },
            },
          })
        } else {
          console.warn(
            `  [${order.number}] source ≠ POS : suppression sans restauration automatique du stock.`
          )
        }

        await tx.storeOrder.delete({ where: { id: order.id } })
      })
      deleted++
      console.log(`Supprimé : ${order.number}`)
    } catch (e) {
      console.error(`Échec ${order.number}:`, e)
    }
  }

  console.log(`\nTerminé. ${deleted}/${orders.length} commande(s) supprimée(s).`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect().finally(() => process.exit(1))
})
