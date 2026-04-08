const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Remplir les données juridiques du magasin "Camp de Gaul"
  const store = await prisma.store.findFirst();
  if (store) {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        rccm:         'GA-LBV-01-2024-B12-00123',
        nif:          '742110987654',
        cnssEmployeur:'CNSS-EMP-GAB-45678',
        phone:        store.phone || '+241 011 234 567',
        email:        store.email || 'contact@campgaul.ga',
      }
    });
    console.log('Magasin mis a jour :', store.name);
  }

  // 2. Créer/mettre à jour PayrollCompanySettings
  const existing = await prisma.payrollCompanySettings.findFirst();
  const data = {
    companyName:        'Camp de Gaul SARL',
    companyAddress:     'Derrière le camp de gaul, Libreville',
    companyCity:        'Libreville',
    companyCountry:     'Gabon',
    rccmNumber:         'GA-LBV-01-2024-B12-00123',
    nifNumber:          '742110987654',
    cnssEmployerNumber: 'CNSS-EMP-GAB-45678',
    companyPhone:       '+241 011 234 567',
    companyEmail:       'contact@campgaul.ga',
    conventionCollective: 'Convention collective du commerce gabonais',
  };

  if (existing) {
    await prisma.payrollCompanySettings.update({ where: { id: existing.id }, data });
    console.log('PayrollCompanySettings mis a jour');
  } else {
    await prisma.payrollCompanySettings.create({ data });
    console.log('PayrollCompanySettings cree');
  }

  // 3. Afficher les IDs des bulletins disponibles
  const payrolls = await prisma.payroll.findMany({
    where: { status: { in: ['VALIDATED','APPROVED','PAID','PARTIALLY_PAID'] } },
    include: {
      employeeProfile: { include: { user: { select: { firstName:true, lastName:true } } } },
      period: { select: { name:true } }
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n========== URLS DE BULLETIN A OUVRIR ==========');
  payrolls.forEach(p => {
    const nom = (p.employeeProfile?.user?.firstName || '') + ' ' + (p.employeeProfile?.user?.lastName || '');
    console.log('  ' + nom.trim() + ' (' + p.period?.name + ') :');
    console.log('  http://localhost:3000/api/payroll/print?ids=' + p.id);
    console.log('');
  });

  // URL pour imprimer tous les bulletins ensemble
  const allIds = payrolls.map(p => p.id).join(',');
  console.log('  Tous ensemble :');
  console.log('  http://localhost:3000/api/payroll/print?ids=' + allIds);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
