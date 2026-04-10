const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Valeurs de référence
  const brut         = 557678  // base + ancienneté + heures sup + nutrition + transport
  const cnss         = 11250   // CNSS salariale (2.5% × 450 000)
  const dejaVerse    = 66000   // nutrition + transport déjà versés quotidiennement
  const netBulletin  = brut - cnss   // = 546 428 (net du bulletin, CNSS déjà retirée)
  const netAPayer    = netBulletin - cnss - dejaVerse  // = 469 178

  console.log('=== Recalcul NET À PAYER ===')
  console.log('Brut total          :', brut)
  console.log('CNSS (2.5% base)    :', cnss)
  console.log('Net du bulletin     :', netBulletin)
  console.log('− CNSS Employé      :', cnss)
  console.log('− Déjà versé        :', dejaVerse)
  console.log('NET À PAYER         :', netAPayer)

  await prisma.payroll.update({
    where: { number: 'BP-TEST-2026-05-001' },
    data: {
      netSalary:       netBulletin,   // 546 428
      remainingAmount: netAPayer,     // 469 178
    }
  })

  console.log('\n✅ Base de données mise à jour avec succès.')
  console.log('Lien bulletin : http://localhost:3000/api/payroll/print?ids=cmnq6fyda000ku0egqdsc7yza')
}

main().catch(console.error).finally(() => prisma.$disconnect())
