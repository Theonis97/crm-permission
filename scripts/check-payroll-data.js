const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payrolls = await prisma.payroll.findMany({
    where: { status: { in: ['VALIDATED','APPROVED','PAID','PARTIALLY_PAID'] } },
    include: {
      employeeProfile: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } }
        }
      },
      period: { select: { name: true } }
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  const settings = await prisma.payrollCompanySettings.findFirst();
  const store = await prisma.store.findFirst({
    select: { name: true, rccm: true, nif: true, cnssEmployeur: true, address: true, phone: true }
  });

  console.log('\n========== BULLETINS IMPRIMABLES ==========');
  if (payrolls.length === 0) {
    console.log('Aucun bulletin validé/approuvé/payé trouvé.');
  } else {
    payrolls.forEach(p => {
      const nom = (p.employeeProfile?.user?.firstName || '') + ' ' + (p.employeeProfile?.user?.lastName || '');
      console.log('  ID      :', p.id);
      console.log('  Numéro  :', p.number);
      console.log('  Statut  :', p.status);
      console.log('  Employé :', nom.trim());
      console.log('  Période :', p.period?.name);
      console.log('  ---');
    });
  }

  console.log('\n========== PARAMÈTRES ENTREPRISE PAIE ==========');
  if (!settings) {
    console.log('Aucun paramètre entreprise configuré.');
  } else {
    console.log('  Raison sociale :', settings.companyName || '(vide)');
    console.log('  Adresse        :', settings.companyAddress || '(vide)');
    console.log('  RCCM           :', settings.rccmNumber || '(vide)');
    console.log('  NIF            :', settings.nifNumber || '(vide)');
    console.log('  CNSS Employeur :', settings.cnssEmployerNumber || '(vide)');
  }

  console.log('\n========== MAGASIN (données de secours) ==========');
  if (!store) {
    console.log('Aucun magasin trouvé.');
  } else {
    console.log('  Nom            :', store.name || '(vide)');
    console.log('  Adresse        :', store.address || '(vide)');
    console.log('  RCCM           :', store.rccm || '(vide)');
    console.log('  NIF            :', store.nif || '(vide)');
    console.log('  CNSS Employeur :', store.cnssEmployeur || '(vide)');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
