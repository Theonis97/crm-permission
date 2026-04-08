/**
 * Corrige le bulletin de test pour refléter que :
 * - L'indemnité transport (30 000) est déjà versée quotidiennement
 * - Un acompte de 200 000 a été versé le 15 mai
 *
 * Net calculé          = 511 625 FCFA
 * - Transport versé    =  -30 000 FCFA  (versé chaque jour)
 * - Acompte 15/05      = -200 000 FCFA  (avance mi-mois)
 * ─────────────────────────────────────
 * NET À PAYER fin mois = 281 625 FCFA
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NET_SALAIRE      = 511_625;
const TRANSPORT        =  30_000;
const ACOMPTE          = 200_000;
const TOTAL_VERSE      = TRANSPORT + ACOMPTE;   // 230 000
const RESTANT          = NET_SALAIRE - TOTAL_VERSE;  // 281 625

async function main() {
  const payroll = await prisma.payroll.findUnique({ where: { number: 'BP-TEST-2026-05-001' } });
  if (!payroll) throw new Error('Bulletin introuvable. Lancez d\'abord create-test-payroll.js');

  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });

  // Supprimer les anciens paiements
  await prisma.payrollPayment.deleteMany({ where: { payrollId: payroll.id } });

  // 1. Versement transport (quotidien tout le mois)
  await prisma.payrollPayment.create({
    data: {
      payrollId:   payroll.id,
      amount:      TRANSPORT,
      paymentDate: new Date('2026-05-31'),
      paymentMode: 'CASH',
      reference:   'TRANSPORT-MAI-2026',
      notes:       'Indemnité transport — versée quotidiennement (cumul mois)',
      paidById:    admin.id,
    }
  });

  // 2. Acompte mi-mois
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

  // Mettre à jour le bulletin
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: {
      status:          'PARTIALLY_PAID',
      paidAmount:      TOTAL_VERSE,
      remainingAmount: RESTANT,
      paidAt:          new Date('2026-05-15'),
    }
  });

  console.log('\n✅ Bulletin mis à jour !');
  console.log('');
  console.log('  Net calculé sur bulletin  :  511 625 FCFA');
  console.log('  - Transport déjà versé    :  -30 000 FCFA  (quotidien)');
  console.log('  - Acompte du 15/05        : -200 000 FCFA');
  console.log('  ─────────────────────────────────────────');
  console.log('  NET À PAYER EN FIN DE MOIS:  281 625 FCFA');
  console.log('');
  console.log('🔗 URL du bulletin :');
  console.log('http://localhost:3000/api/payroll/print?ids=' + payroll.id);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
