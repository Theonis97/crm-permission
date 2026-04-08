/**
 * Ajout :
 * - 5 heures supplémentaires (taux ×1,5)
 * - Prime d'ancienneté : 5% du salaire de base (5 ans d'ancienneté)
 *
 * Calculs :
 *   Taux horaire    = 450 000 / (22j × 8h) = 2 557 FCFA/h
 *   Heures sup (5h) = 5 × 2 557 × 0,5     = 6 393 FCFA  (soumis CNSS)
 *   Brut avec sup   = 450 000 + 6 393      = 456 393 FCFA
 *   Ancienneté (5%) = 450 000 × 5%         = 22 500 FCFA (soumis CNSS)
 *
 *   Base CNSS       = 456 393 + 22 500     = 478 893 FCFA
 *   CNSS (2,5%)     = 478 893 × 2,5%       = 11 972 FCFA
 *   CNSS employeur  = 478 893 × 16,75%     = 80 215 FCFA
 *
 *   NET TOTAL = 456 393 + 22 500 + 22 000 + 44 000 - 11 972 = 532 921 FCFA
 *   Déjà versé (nutrition + transport)  = 66 000 FCFA
 *   RESTE À PAYER FIN MOIS             = 466 921 FCFA
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JOURS           = 22;
const BASE_SALARY     = 450_000;
const HEURES_NORMALES = JOURS * 8;           // 176 h
const HEURES_SUP      = 5;
const TAUX_HORAIRE    = Math.round(BASE_SALARY / HEURES_NORMALES); // 2 557

// Heures sup = supplément uniquement (×0,5 car le ×1 est déjà dans le brut)
const MONTANT_HEURES_SUP = Math.round(HEURES_SUP * TAUX_HORAIRE * 0.5); // 6 393
const BRUT_AVEC_SUP      = BASE_SALARY + MONTANT_HEURES_SUP;              // 456 393

// Prime d'ancienneté
const ANCIENNETE_PCT     = 5;
const MONTANT_ANCIENNETE = Math.round(BASE_SALARY * ANCIENNETE_PCT / 100); // 22 500

// Indemnités quotidiennes
const NUTRITION  = 1_000 * JOURS; // 22 000
const TRANSPORT  = 2_000 * JOURS; // 44 000

// CNSS sur : brut avec sup + ancienneté (indemnités exonérées)
const BASE_CNSS          = BRUT_AVEC_SUP + MONTANT_ANCIENNETE; // 478 893
const CNSS_SAL           = Math.round(BASE_CNSS * 2.5 / 100);  // 11 972
const CNSS_EMPL          = Math.round(BASE_CNSS * 16.75 / 100);// 80 215

const NET       = BRUT_AVEC_SUP + MONTANT_ANCIENNETE + NUTRITION + TRANSPORT - CNSS_SAL;
const DEJA_VERSE = NUTRITION + TRANSPORT; // 66 000
const RESTE     = NET - DEJA_VERSE;

async function main() {
  const admin   = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  const payroll = await prisma.payroll.findUnique({ where: { number: 'BP-TEST-2026-05-001' } });
  if (!payroll) throw new Error('Bulletin introuvable.');

  // ── Rubrique prime d'ancienneté ──────────────────────────────────────────
  let rubAncien = await prisma.payrollRubric.findUnique({ where: { code: 'PRIME_ANCIEN_TEST' } });
  if (!rubAncien) {
    rubAncien = await prisma.payrollRubric.create({
      data: {
        code:              'PRIME_ANCIEN_TEST',
        name:              "Prime d'ancienneté",
        description:       '5% du salaire de base — soumise aux cotisations (5 ans)',
        type:              'PRIME',
        isSubjectToTax:    true,
        isSubjectToSocial: true,
        calculationBase:   'BASE_SALARY',
        defaultRate:       ANCIENNETE_PCT,
        displayOrder:      1,
        isActive:          true,
      }
    });
  }

  // Lier la rubrique au profil de l'employé test
  const testUser = await prisma.user.findUnique({ where: { email: 'jb.mboumba.test@campgaul.ga' } });
  const profile  = await prisma.employeePayrollProfile.findUnique({ where: { userId: testUser.id } });

  const exists = await prisma.employeeRubric.findUnique({
    where: { employeeProfileId_rubricId: { employeeProfileId: profile.id, rubricId: rubAncien.id } }
  });
  if (!exists) {
    await prisma.employeeRubric.create({
      data: { employeeProfileId: profile.id, rubricId: rubAncien.id, isActive: true, createdById: admin.id }
    });
  }

  // ── Mettre à jour les lignes de rubriques ────────────────────────────────
  // Supprimer l'ancienne prime de rendement (remplacée par ancienneté)
  await prisma.payrollRubricLine.deleteMany({
    where: { payrollId: payroll.id, rubricType: 'PRIME' }
  });

  // Ajouter prime d'ancienneté
  await prisma.payrollRubricLine.create({
    data: {
      payrollId:         payroll.id,
      rubricId:          rubAncien.id,
      rubricCode:        rubAncien.code,
      rubricName:        "Prime d'ancienneté (5% × 5 ans)",
      rubricType:        'PRIME',
      baseAmount:        BASE_SALARY,
      rate:              ANCIENNETE_PCT,
      amount:            MONTANT_ANCIENNETE,
      isSubjectToTax:    true,
      isSubjectToSocial: true,
      exemptAmount:      0,
      taxableAmount:     MONTANT_ANCIENNETE,
    }
  });

  // ── Mettre à jour la cotisation CNSS (nouvelle base) ────────────────────
  const cnss = await prisma.payrollContribution.findUnique({ where: { code: 'CNSS_SAL_TEST' } });
  await prisma.payrollContributionLine.deleteMany({ where: { payrollId: payroll.id } });
  await prisma.payrollContributionLine.create({
    data: {
      payrollId:      payroll.id,
      contributionId: cnss.id,
      baseAmount:     BASE_CNSS,
      appliedRate:    2.5 / 100,
      amount:         CNSS_SAL,
    }
  });

  // ── Mettre à jour le bulletin principal ──────────────────────────────────
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: {
      grossSalary:         BRUT_AVEC_SUP,   // brut inclut déjà les heures sup
      hoursWorked:         HEURES_NORMALES + HEURES_SUP,
      overtimeHours:       HEURES_SUP,
      totalDeductions:     CNSS_SAL,
      netSalary:           NET,
      employerCharges:     CNSS_EMPL,
      paidAmount:          DEJA_VERSE,
      remainingAmount:     RESTE,
      status:              'PARTIALLY_PAID',
    }
  });

  // ── Mettre à jour les versements ─────────────────────────────────────────
  await prisma.payrollPayment.deleteMany({ where: { payrollId: payroll.id } });
  await prisma.payrollPayment.create({
    data: {
      payrollId:   payroll.id,
      amount:      NUTRITION,
      paymentDate: new Date('2026-05-31'),
      paymentMode: 'CASH',
      reference:   'NUTRITION-MAI-2026',
      notes:       'Nutrition 1 000 FCFA × 22 jours',
      paidById:    admin.id,
    }
  });
  await prisma.payrollPayment.create({
    data: {
      payrollId:   payroll.id,
      amount:      TRANSPORT,
      paymentDate: new Date('2026-05-31'),
      paymentMode: 'CASH',
      reference:   'TRANSPORT-MAI-2026',
      notes:       'Transport 2 000 FCFA × 22 jours',
      paidById:    admin.id,
    }
  });

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('\n✅ Bulletin mis à jour\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        BULLETIN FINAL — MAI 2026                        ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  RÉMUNÉRATION                                            ║');
  console.log(`║  Salaire de base          :       ${BASE_SALARY.toLocaleString('fr')} FCFA        ║`);
  console.log(`║  + Heures sup (5h × 1,5)  :  +      ${MONTANT_HEURES_SUP.toLocaleString('fr')} FCFA        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  PRIME                                                   ║');
  console.log(`║  + Ancienneté (5% × 5ans) :  +     ${MONTANT_ANCIENNETE.toLocaleString('fr')} FCFA        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  INDEMNITÉS (exonérées CNSS)                             ║');
  console.log(`║  + Nutrition (1000×22j)   :  +     ${NUTRITION.toLocaleString('fr')} FCFA        ║`);
  console.log(`║  + Transport (2000×22j)   :  +     ${TRANSPORT.toLocaleString('fr')} FCFA        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  COTISATIONS SOCIALES                                    ║');
  console.log(`║  Base CNSS (brut + prime) :       ${BASE_CNSS.toLocaleString('fr')} FCFA        ║`);
  console.log(`║  - CNSS Employé  (2,5%)   :  -     ${CNSS_SAL.toLocaleString('fr')} FCFA        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  NET TOTAL DÛ             :       ${NET.toLocaleString('fr')} FCFA        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Nutrition déjà versée    :  -     ${NUTRITION.toLocaleString('fr')} FCFA        ║`);
  console.log(`║  Transport déjà versé     :  -     ${TRANSPORT.toLocaleString('fr')} FCFA        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  ★ RESTE À PAYER FIN MOIS :       ${RESTE.toLocaleString('fr')} FCFA        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Pour l'employeur (16,75%):  +     ${CNSS_EMPL.toLocaleString('fr')} FCFA        ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n🔗 http://localhost:3000/api/payroll/print?ids=' + payroll.id);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
