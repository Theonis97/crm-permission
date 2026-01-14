import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function migrateExpenseDocuments() {
  console.log("🔄 Migration des documents de dépenses...")

  // 1. Migrer les documents des dépenses existantes
  const expensesWithDocs = await prisma.expense.findMany({
    where: {
      documentUrl: { not: null }
    },
    select: {
      id: true,
      documentUrl: true,
      documentName: true
    }
  })

  console.log(`📄 ${expensesWithDocs.length} dépenses avec documents à migrer`)

  for (const expense of expensesWithDocs) {
    // Vérifier si le document n'existe pas déjà
    const existingDoc = await prisma.expenseDocument.findFirst({
      where: {
        expenseId: expense.id,
        url: expense.documentUrl!
      }
    })

    if (!existingDoc) {
      await prisma.expenseDocument.create({
        data: {
          expenseId: expense.id,
          url: expense.documentUrl!,
          name: expense.documentName || "Document",
          type: "invoice"
        }
      })
      console.log(`  ✅ Document migré pour dépense ${expense.id}`)
    } else {
      console.log(`  ⏭️  Document déjà migré pour dépense ${expense.id}`)
    }
  }

  // 2. Migrer les reçus des paiements existants
  const paymentsWithReceipts = await prisma.expensePayment.findMany({
    where: {
      receiptUrl: { not: null }
    },
    select: {
      id: true,
      receiptUrl: true,
      receiptName: true
    }
  })

  console.log(`🧾 ${paymentsWithReceipts.length} paiements avec reçus à migrer`)

  for (const payment of paymentsWithReceipts) {
    // Vérifier si le document n'existe pas déjà
    const existingDoc = await prisma.expenseDocument.findFirst({
      where: {
        paymentId: payment.id,
        url: payment.receiptUrl!
      }
    })

    if (!existingDoc) {
      await prisma.expenseDocument.create({
        data: {
          paymentId: payment.id,
          url: payment.receiptUrl!,
          name: payment.receiptName || "Reçu",
          type: "receipt"
        }
      })
      console.log(`  ✅ Reçu migré pour paiement ${payment.id}`)
    } else {
      console.log(`  ⏭️  Reçu déjà migré pour paiement ${payment.id}`)
    }
  }

  console.log("✅ Migration terminée!")
}

migrateExpenseDocuments()
  .catch((e) => {
    console.error("❌ Erreur lors de la migration:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
