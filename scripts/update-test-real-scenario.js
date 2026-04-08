/**
 * VRAI SCÉNARIO DE L'ENTREPRISE
 * ══════════════════════════════
 * - Salaire de base CDI         : 450 000 FCFA
 * - Indemnité nutrition         :   1 000 FCFA × 22 jours = 22 000 FCFA (versée chaque jour)
 * - Indemnité transport         :   2 000 FCFA × 22 jours = 44 000 FCFA (versée chaque jour)
 * - CNSS salariale (2,5%)       : sur salaire de base seulement (indemnités exonérées)
 * - TRIMF                       : 1 000 FCFA forfait
 * - CNSS Employeur (16,75%)     : payée par l'entreprise, visible sur le bulletin
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JOURS          = 22;
const BASE_SALARY    = 450_000;
const NUTRITION_JOUR =   1_000;
const TRANSPORT_JOUR =   2_000;

const TOTAL_NUTRITION = NUTRITION_JOUR * JOURS;   //  22 000
const TOTAL_TRANSPORT = TRANSPORT_JOUR * JOURS;   //  44 000
const TOTAL_INDEMNITES = TOTAL_NUTRITION + TOTAL_TRANSPORT; // 66 000

// CNSS sur salaire de base seulement (indemnités exonérées)
const CNSS_TAUX      = 2.5;
const CNSS_MONTANT   = Math.round(BASE_SALARY * CNSS_TAUX / 100);  // 11 250
const TRIMF          = 1_000;
const TOTAL_RETENUES = CNSS_MONTANT + TRIMF;  // 12 250

// CNSS Employeur
const CNSS_PATRON_TAUX   = 16.75;
const CNSS_PATRON_MONTANT = Math.round(BASE_SALARY * CNSS_PATRON_TAUX / 100); // 75 375

// Net final
const NET = BASE_SALARY + TOTAL_INDEMNITES - TOTAL_RETENUES; // 503 750

// Déjà versé quotidiennement
const DEJA_VERSE    = TOTAL_INDEMNITES; // 66 000
const RESTE_A_PAYER = NET - DEJA_VERSE; // 437 750

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  MISE À JOUR BULLETIN — SCÉNARIO RÉEL');
  console.log('══════════════════════════════════════════════\n');

  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  const payroll = await prisma.payroll.findUnique({ where: { number: 'BP-TEST-2026-05-001' } });
  if (!payroll) throw new Error('Bulletin introuvable. Lancez create-test-payroll.js d\'abord.');

  // ── Mettre à jour les rubriques ───────────────────────────────────────────

  // Supprimer les anciennes rubriques du bulletin
  await prisma.payrollRubricLine.deleteMany({ where: { payrollId: payroll.id } });

  // Récupérer ou créer rubrique Nutrition
  let rubNutrition = await prisma.payrollRubric.findUnique({ where: { code: 'IND_NUTRIT_TEST' } });
  if (!rubNutrition) {
    rubNutrition = await prisma.payrollRubric.create({
      data: {
        code:              'IND_NUTRIT_TEST',
        name:              'Indemnité de nutrition',
        description:       '1 000 FCFA par jour travaillé — exonérée de CNSS',
        type:              'INDEMNITY',
        isSubjectToTax:    false,
        isSubjectToSocial: false,
        calculationBase:   'FIXED',
        defaultAmount:     TOTAL_NUTRITION,
        exemptionCeiling:  TOTAL_NUTRITION,
        displayOrder:      1,
        isActive:          true,
      }
    });
  }

  // Récupérer ou créer rubrique Transport
  let rubTransport = await prisma.payrollRubric.findUnique({ where: { code: 'IND_TRANSP_TEST' } });
  if (!rubTransport) {
    rubTransport = await prisma.payrollRubric.create({
      data: {
        code:              'IND_TRANSP_TEST',
        name:              'Indemnité de transport',
        description:       '2 000 FCFA par jour travaillé — exonérée de CNSS',
        type:              'INDEMNITY',
        isSubjectToTax:    false,
        isSubjectToSocial: false,
        calculationBase:   'FIXED',
        defaultAmount:     TOTAL_TRANSPORT,
        exemptionCeiling:  TOTAL_TRANSPORT,
        displayOrder:      2,
        isActive:          true,
      }
    });
  }

  // Supprimer ancienne prime de rendement du profil (scénario simplifié)
  const profile = await prisma.employeePayrollProfile.findUnique({ where: { userId: (await prisma.user.findUnique({ where: { email: 'jb.mboumba.test@campgaul.ga' } })).id } });

  // Lier les nouvelles rubriques au profil
  for (const rub of [rubNutrition, rubTransport]) {
    const exists = await prisma.employeeRubric.findUnique({
      where: { employeeProfileId_rubricId: { employeeProfileId: profile.id, rubricId: rub.id } }
    });
    if (!exists) {
      await prisma.employeeRubric.create({
        data: { employeeProfileId: profile.id, rubricId: rub.id, isActive: true, createdById: admin.id }
      });
    }
  }

  // Créer les lignes de rubriques sur le bulletin
  await prisma.payrollRubricLine.create({
    data: {
      payrollId:         payroll.id,
      rubricId:          rubNutrition.id,
      rubricCode:        rubNutrition.code,
      rubricName:        'Indemnité de nutrition (1 000 × 22 j)',
      rubricType:        'INDEMNITY',
      baseAmount:        TOTAL_NUTRITION,
      rate:              null,
      amount:            TOTAL_NUTRITION,
      isSubjectToTax:    false,
      isSubjectToSocial: false,
      exemptAmount:      TOTAL_NUTRITION,
      taxableAmount:     0,
    }
  });

  await prisma.payrollRubricLine.create({
    data: {
      payrollId:         payroll.id,
      rubricId:          rubTransport.id,
      rubricCode:        rubTransport.code,
      rubricName:        'Indemnité de transport (2 000 × 22 j)',
      rubricType:        'INDEMNITY',
      baseAmount:        TOTAL_TRANSPORT,
      rate:              null,
      amount:            TOTAL_TRANSPORT,
      isSubjectToTax:    false,
      isSubjectToSocial: false,
      exemptAmount:      TOTAL_TRANSPORT,
      taxableAmount:     0,
    }
  });

  // ── Mettre à jour les cotisations ─────────────────────────────────────────
  await prisma.payrollContributionLine.deleteMany({ where: { payrollId: payroll.id } });

  const cnss = await prisma.payrollContribution.findUnique({ where: { code: 'CNSS_SAL_TEST' } });
  const trimf = await prisma.payrollContribution.findUnique({ where: { code: 'TRIMF_TEST' } });

  await prisma.payrollContributionLine.create({
    data: {
      payrollId:      payroll.id,
      contributionId: cnss.id,
      baseAmount:     BASE_SALARY,
      appliedRate:    CNSS_TAUX / 100,
      amount:         CNSS_MONTANT,
    }
  });

  await prisma.payrollContributionLine.create({
    data: {
      payrollId:      payroll.id,
      contributionId: trimf.id,
      baseAmount:     0,
      appliedRate:    0,
      amount:         TRIMF,
    }
  });

  // ── Mettre à jour les montants du bulletin ────────────────────────────────
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: {
      grossSalary:         BASE_SALARY,
      totalDeductions:     TOTAL_RETENUES,
      totalBonuses:        0,
      netSalary:           NET,
      employerCharges:     CNSS_PATRON_MONTANT,
      status:              'PARTIALLY_PAID',
      paidAmount:          DEJA_VERSE,
      remainingAmount:     RESTE_A_PAYER,
    }
  });

  // ── Mettre à jour les versements déjà faits ───────────────────────────────
  await prisma.payrollPayment.deleteMany({ where: { payrollId: payroll.id } });

  await prisma.payrollPayment.create({
    data: {
      payrollId:   payroll.id,
      amount:      TOTAL_NUTRITION,
      paymentDate: new Date('2026-05-31'),
      paymentMode: 'CASH',
      reference:   'NUTRITION-MAI-2026',
      notes:       'Nutrition versée quotidiennement (1 000 × 22 jours)',
      paidById:    admin.id,
    }
  });

  await prisma.payrollPayment.create({
    data: {
      payrollId:   payroll.id,
      amount:      TOTAL_TRANSPORT,
      paymentDate: new Date('2026-05-31'),
      paymentMode: 'CASH',
      reference:   'TRANSPORT-MAI-2026',
      notes:       'Transport versé quotidiennement (2 000 × 22 jours)',
      paidById:    admin.id,
    }
  });

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           BULLETIN — JEAN-BAPTISTE MBOUMBA               ║');
  console.log('║           Mai 2026 — 22 jours travaillés                 ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  GAINS                                                    ║');
  console.log('║  Salaire de base            :        450 000 FCFA        ║');
  console.log('║  + Ind. nutrition (×22j)    :  +      22 000 FCFA        ║');
  console.log('║  + Ind. transport (×22j)    :  +      44 000 FCFA        ║');
  console.log('║  = Total brut               :        516 000 FCFA        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  RETENUES (part employé)                                  ║');
  console.log('║  - CNSS salariale 2,5%      :  -      11 250 FCFA        ║');
  console.log('║    (sur 450 000, indemnités exonérées)                    ║');
  console.log('║  - TRIMF                    :  -       1 000 FCFA        ║');
  console.log('║  = Total retenues           :  -      12 250 FCFA        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  NET À PAYER TOTAL          :        503 750 FCFA        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  DÉJÀ VERSÉ QUOTIDIENNEMENT                               ║');
  console.log('║  - Nutrition (1000×22j)     :  -      22 000 FCFA        ║');
  console.log('║  - Transport (2000×22j)     :  -      44 000 FCFA        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  ★ RESTE À PAYER FIN MOIS   :        437 750 FCFA        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  CE QUE L\'EMPLOYEUR COTISE À LA CNSS (en plus)           ║');
  console.log('║  CNSS Employeur 16,75%      :  +      75 375 FCFA        ║');
  console.log('║  (sur 450 000 — versé par l\'entreprise à la CNSS)        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n🔗 URL du bulletin :');
  console.log('http://localhost:3000/api/payroll/print?ids=' + payroll.id);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
