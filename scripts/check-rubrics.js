const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const payroll = await prisma.payroll.findUnique({
    where: { number: 'BP-TEST-2026-05-001' },
    include: {
      rubricLines: { include: { rubric: true } }
    }
  })

  console.log('=== Données du bulletin ===')
  console.log('grossSalary     :', Number(payroll.grossSalary))
  console.log('netSalary       :', Number(payroll.netSalary))
  console.log('totalDeductions :', Number(payroll.totalDeductions))
  console.log('overtimeHours   :', payroll.overtimeHours)
  console.log('daysWorked      :', payroll.daysWorked)
  console.log('expectedDays    :', payroll.expectedWorkingDays)
  console.log('')
  console.log('=== Rubriques ===')
  payroll.rubricLines.forEach(r => {
    console.log(`  [${r.rubric?.type || r.rubricType}] ${r.rubric?.name || r.description} → ${Number(r.amount)} FCFA`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
