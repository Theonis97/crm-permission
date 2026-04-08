const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contribs = await prisma.payrollContribution.findMany({
    select: { id: true, name: true, employeeRate: true, employerRate: true, isActive: true }
  });

  const profiles = await prisma.employeeProfile.findMany({
    include: { user: { select: { firstName: true, lastName: true } } },
    take: 5
  });

  const periods = await prisma.payrollPeriod.findMany({
    take: 5,
    orderBy: { startDate: 'desc' }
  });

  const rubrics = await prisma.payrollRubric.findMany({
    select: { id: true, name: true, type: true, calculationMethod: true, isActive: true },
    take: 10
  });

  console.log('\n=== COTISATIONS ===');
  console.log(JSON.stringify(contribs, null, 2));

  console.log('\n=== PROFILS EMPLOYES ===');
  console.log(JSON.stringify(profiles.map(p => ({
    id: p.id,
    nom: (p.user?.firstName || '') + ' ' + (p.user?.lastName || ''),
    salaire: p.baseSalary,
    contrat: p.contractType,
    poste: p.position,
    joursParSemaine: p.workingDaysPerWeek,
    heuresParJour: p.workingHoursPerDay,
  })), null, 2));

  console.log('\n=== PERIODES ===');
  console.log(JSON.stringify(periods.map(p => ({
    id: p.id,
    name: p.name,
    status: p.status,
    debut: p.startDate,
    fin: p.endDate,
  })), null, 2));

  console.log('\n=== RUBRIQUES ===');
  console.log(JSON.stringify(rubrics, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
