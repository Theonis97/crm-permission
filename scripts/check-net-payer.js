const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const p = await prisma.payroll.findUnique({ where: { number: 'BP-TEST-2026-05-001' } })
  if (!p) { console.log('Payroll introuvable'); return }

  const brut        = Number(p.netSalary)
  const cnss        = Number(p.totalDeductions)
  const dejaVerse   = Number(p.paidAmount)
  const remaining   = Number(p.remainingAmount)
  const netAPayer   = brut - cnss - dejaVerse

  console.log('=== Valeurs en base ===')
  console.log('netSalary (brut)   :', brut)
  console.log('totalDeductions    :', cnss)
  console.log('paidAmount         :', dejaVerse)
  console.log('remainingAmount DB :', remaining)
  console.log('status             :', p.status)
  console.log('')
  console.log('=== Calcul NET À PAYER ===')
  console.log(brut, '(brut) −', cnss, '(CNSS) −', dejaVerse, '(déjà versé) =', netAPayer)
}

main().catch(console.error).finally(() => prisma.$disconnect())
