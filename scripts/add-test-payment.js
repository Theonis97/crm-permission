/**
 * Ajoute un acompte (versement partiel) au bulletin de test
 * Scénario : 200 000 FCFA versés en acompte le 15 mai
 * Net restant à payer : 511 625 - 200 000 = 311 625 FCFA
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ACOMPTE        = 200_000;  // FCFA versés en avance
const NET_SALAIRE    = 511_625;  // net calculé du bulletin
const RESTANT        = NET_SALAIRE - ACOMPTE;  // 311 625

async function main() {
  // Récupérer le bulletin de test
  const payroll = await prisma.payroll.findUnique({
    where: { number: 'BP-TEST-2026-05-001' },
  });
  if (!payroll) throw new Error('Bulletin BP-TEST-2026-05-001 introuvable. Lancez d\'abord create-test-payroll.js');

  // Récupérer un admin pour paidById
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });

  // Supprimer les anciens paiements test si existants
  await prisma.payrollPayment.deleteMany({ where: { payrollId: payroll.id } });

  // Créer l'acompte
  await prisma.payrollPayment.create({
    data: {
      payrollId:   payroll.id,
      amount:      ACOMPTE,
      paymentDate: new Date('2026-05-15'),
      paymentMode: 'CASH',
      reference:   'ACOMPTE-MAI-2026',
      notes:       'Acompte versé mi-mois en espèces',
      paidById:    admin.id,
    }
  });

  // Mettre à jour les montants du bulletin
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: {
      status:          'PARTIALLY_PAID',
      paidAmount:      ACOMPTE,
      remainingAmount: RESTANT,
      paidAt:          new Date('2026-05-15'),
    }
  });

  console.log('\n✅ Acompte ajouté avec succès !');
  console.log('─────────────────────────────────────────');
  console.log('  NET total du bulletin :  511 625 FCFA');
  console.log('  Acompte versé (15/05) : -200 000 FCFA');
  console.log('  ─────────────────────────────────────');
  console.log('  RESTE À PAYER          :  311 625 FCFA');
  console.log('─────────────────────────────────────────');
  console.log('\n🔗 URL du bulletin :');
  console.log('http://localhost:3000/api/payroll/print?ids=' + payroll.id);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
