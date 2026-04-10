/**
 * Met à jour le bulletin de test avec les vraies indemnités :
 *   Transport  : 2 000 FCFA/jour × 22 jours = 44 000 FCFA (exonérée CNSS)
 *   Nutrition  : 1 000 FCFA/jour × 22 jours = 22 000 FCFA (exonérée CNSS)
 *
 * CNSS calculée sur le salaire de base uniquement (indemnités exonérées) :
 *   Part salariale  : 450 000 × 2,5%  = 11 250 FCFA  (déduit du salaire)
 *   CNSS Employeur  : 450 000 × 16,75% = 75 375 FCFA  (à la charge de l'entreprise)
 *
 * Détail du NET :
 *   Salaire de base        450 000
 *   + Transport (44 000) + Nutrition (22 000)  = +66 000
 *   - CNSS salariale       -11 250
 *   ─────────────────────────────────
 *   NET calculé            504 750 FCFA
 *
 *   Indemnités déjà versées quotidiennement : -66 000
 *   ─────────────────────────────────────────
 *   NET À PAYER en fin de mois : 438 750 FCFA
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JOURS          = 22;
const BASE_SALARY    = 450_000;
const TRANSPORT_J    = 2_000;
const NUTRITION_J    = 1_000;
const TRANSPORT_M    = TRANSPORT_J * JOURS;   // 44 000
const NUTRITION_M    = NUTRITION_J * JOURS;   // 22 000
const TOTAL_INDEM    = TRANSPORT_M + NUTRITION_M;  // 66 000

// CNSS calculée sur le brut (base uniquement, indemnités exonérées)
const CNSS_TAUX_SAL  = 2.5;
const CNSS_TAUX_PAT  = 16.75;
const CNSS_SAL       = Math.round(BASE_SALARY * CNSS_TAUX_SAL / 100);   // 11 250
const CNSS_PAT       = Math.round(BASE_SALARY * CNSS_TAUX_PAT / 100);   // 75 375
const TOTAL_RETENUES = CNSS_SAL;  // pas de TRIMF pour simplifier

const NET_CALCULE    = BASE_SALARY + TOTAL_INDEM - TOTAL_RETENUES;  // 504 750
const NET_FIN_MOIS   = NET_CALCULE - TOTAL_INDEM;  // 438 750 (indemnités déjà versées)

async function main() {
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });

  // ── Supprimer les anciennes rubriques test ────────────────────────────────
  await prisma.payrollRubric.deleteMany({
    where: { code: { in: ['PRIME_REND_TEST', 'IND_TRANSP_TEST'] } }
  });

  // ── Créer les nouvelles rubriques ──────────────────────────────────────────
  const rubTransport = await prisma.payrollRubric.upsert({
    where:  { code: 'IND_TRANSP_JOUR' },
    update: {},
    create: {
      code:              'IND_TRANSP_JOUR',
      name:              'Indemnité de transport',
      description:       '2 000 FCFA/jour — versée quotidiennement — exonérée CNSS',
      type:              'INDEMNITY',
      isSubjectToTax:    false,
      isSubjectToSocial: false,
      calculationBase:   'FIXED',
      defaultAmount:     TRANSPORT_M,
      exemptionCeiling:  TRANSPORT_M,
      displayOrder:      1,
      isActive:          true,
    }
  });

  const rubNutrition = await prisma.payrollRubric.upsert({
    where:  { code: 'IND_NUTRI_JOUR' },
    update: {},
    create: {
      code:              'IND_NUTRI_JOUR',
      name:              'Indemnité de nutrition',
      description:       '1 000 FCFA/jour — versée quotidiennement — exonérée CNSS',
      type:              'INDEMNITY',
      isSubjectToTax:    false,
      isSubjectToSocial: false,
      calculationBase:   'FIXED',
      defaultAmount:     NUTRITION_M,
      exemptionCeiling:  NUTRITION_M,
      displayOrder:      2,
      isActive:          true,
    }
  });
  console.log('✓ Rubriques transport et nutrition créées');

  // ── Récupérer le profil et le bulletin ─────────────────────────────────────
  const profile = await prisma.employeePayrollProfile.findFirst({
    where: { user: { email: 'jb.mboumba.test@campgaul.ga' } }
  });
  if (!profile) throw new Error('Profil introuvable.');

  const payroll = await prisma.payroll.findUnique({ where: { number: 'BP-TEST-2026-05-001' } });
  if (!payroll) throw new Error('Bulletin introuvable.');

  // ── Lier les nouvelles rubriques au profil ─────────────────────────────────
  for (const rubric of [rubTransport, rubNutrition]) {
    await prisma.employeeRubric.upsert({
      where: { employeeProfileId_rubricId: { employeeProfileId: profile.id, rubricId: rubric.id } },
      update: { isActive: true },
      create: { employeeProfileId: profile.id, rubricId: rubric.id, isActive: true, createdById: admin.id }
    });
  }
  console.log('✓ Rubriques liées au profil');

  // ── Mettre à jour la cotisation CNSS (base = salaire seul) ─────────────────
  const cnss = await prisma.payrollContribution.findUnique({ where: { code: 'CNSS_SAL_TEST' } });
  if (cnss) {
    await prisma.payrollContribution.update({
      where: { id: cnss.id },
      data: { description: 'CNSS salariale 2,5 % — base = salaire brut uniquement (indemnités exonérées)' }
    });
  }

  // ── Supprimer les anciennes lignes du bulletin ─────────────────────────────
  await prisma.payrollRubricLine.deleteMany({ where: { payrollId: payroll.id } });
  await prisma.payrollContributionLine.deleteMany({ where: { payrollId: payroll.id } });
  await prisma.payrollPayment.deleteMany({ where: { payrollId: payroll.id } });

  // ── Recréer les lignes de cotisations ──────────────────────────────────────
  await prisma.payrollContributionLine.create({
    data: {
      payrollId:      payroll.id,
      contributionId: cnss.id,
      baseAmount:     BASE_SALARY,        // base = salaire seul
      appliedRate:    CNSS_TAUX_SAL / 100,
      amount:         CNSS_SAL,           // 11 250
    }
  });
  console.log('✓ Ligne CNSS salariale créée (base = 450 000)');

  // ── Recréer les lignes de rubriques ────────────────────────────────────────
  await prisma.payrollRubricLine.create({
    data: {
      payrollId: payroll.id, rubricId: rubTransport.id,
      rubricCode: rubTransport.code, rubricName: rubTransport.name, rubricType: 'INDEMNITY',
      baseAmount: TRANSPORT_M, rate: null, amount: TRANSPORT_M,
      isSubjectToTax: false, isSubjectToSocial: false,
      exemptAmount: TRANSPORT_M, taxableAmount: 0,
    }
  });
  await prisma.payrollRubricLine.create({
    data: {
      payrollId: payroll.id, rubricId: rubNutrition.id,
      rubricCode: rubNutrition.code, rubricName: rubNutrition.name, rubricType: 'INDEMNITY',
      baseAmount: NUTRITION_M, rate: null, amount: NUTRITION_M,
      isSubjectToTax: false, isSubjectToSocial: false,
      exemptAmount: NUTRITION_M, taxableAmount: 0,
    }
  });
  console.log('✓ Lignes indemnités créées');

  // ── Ajouter les versements déjà effectués ──────────────────────────────────
  // Indemnités versées chaque jour (cumul du mois)
  await prisma.payrollPayment.create({
    data: {
      payrollId: payroll.id, amount: TOTAL_INDEM,
      paymentDate: new Date('2026-05-31'),
      paymentMode: 'CASH', reference: 'INDEM-QUOTID-MAI-2026',
      notes: 'Transport (2 000/j) + Nutrition (1 000/j) × 22 jours — versées quotidiennement',
      paidById: admin.id,
    }
  });
  console.log('✓ Versement indemnités quotidiennes ajouté : 66 000 FCFA');

  // ── Mettre à jour les totaux du bulletin ───────────────────────────────────
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: {
      grossSalary:         BASE_SALARY,
      totalDeductions:     TOTAL_RETENUES,   // 11 250
      totalBonuses:        0,
      netSalary:           NET_CALCULE,       // 504 750
      employerCharges:     CNSS_PAT,          // 75 375
      status:              'PARTIALLY_PAID',
      paidAmount:          TOTAL_INDEM,       // 66 000 déjà versés
      remainingAmount:     NET_FIN_MOIS,      // 438 750
      paidAt:              new Date('2026-05-31'),
    }
  });

  // ── Résumé ─────────────────────────────────────────────────────────────────
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           BULLETIN MIS À JOUR — RÉSUMÉ DES CALCULS           ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Salaire de base              :   450 000 FCFA               ║`);
  console.log(`║  + Ind. transport (2000×22j)  :    44 000 FCFA               ║`);
  console.log(`║  + Ind. nutrition (1000×22j)  :    22 000 FCFA               ║`);
  console.log(`║  = Brut total affiché         :   516 000 FCFA               ║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  - CNSS salariale (2,5%×450k) :   -11 250 FCFA               ║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  ★ NET calculé du bulletin    :   504 750 FCFA               ║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Indemnités déjà versées/jour :   -66 000 FCFA               ║`);
  console.log(`║  ────────────────────────────────────────────                ║`);
  console.log(`║  ★ NET À PAYER en fin de mois :   438 750 FCFA               ║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  CNSS EMPLOYEUR (16,75%×450k) :    75 375 FCFA               ║`);
  console.log(`║  (charge de l\'entreprise, hors salaire)                      ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('\n🔗 URL du bulletin :');
  console.log('http://localhost:3000/api/payroll/print?ids=' + payroll.id);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
