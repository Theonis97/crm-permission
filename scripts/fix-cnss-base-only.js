/**
 * CORRECTION FINALE :
 * - CNSS calculée uniquement sur le salaire de base (450 000)
 * - Heures supplémentaires affichées séparément (section dédiée)
 * - Heures sup NON soumises à la CNSS
 *
 * Taux horaire = 450 000 / (22 × 8) = 2 557 FCFA/h
 * Heures sup   = 5h × 2 557 × 1,5   = 19 178 FCFA (section séparée)
 *
 * CNSS base    = 450 000 FCFA (brut seul, sans heures sup)
 * CNSS employé = 450 000 × 2,5%  = 11 250 FCFA
 * CNSS employeur= 450 000 × 16,75% = 75 375 FCFA
 *
 * NET = 450 000 + 19 178 + 22 500 + 22 000 + 44 000 − 11 250 = 546 428 FCFA
 * Déjà versé (nutrition + transport) = 66 000 FCFA
 * RESTE À PAYER FIN MOIS             = 480 428 FCFA
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JOURS           = 22;
const BASE_SALARY     = 450_000;
const HEURES_NORMALES = JOURS * 8;              // 176 h
const HEURES_SUP      = 5;
const TAUX_HORAIRE    = Math.round(BASE_SALARY / HEURES_NORMALES); // 2 557 FCFA/h
const MONTANT_SUP     = Math.round(HEURES_SUP * TAUX_HORAIRE * 1.5); // 19 178 FCFA

const ANCIENNETE      = Math.round(BASE_SALARY * 5 / 100); // 22 500 FCFA
const NUTRITION       = 1_000 * JOURS;  // 22 000
const TRANSPORT       = 2_000 * JOURS;  // 44 000

// CNSS sur salaire de base UNIQUEMENT (pas les heures sup)
const CNSS_SAL        = Math.round(BASE_SALARY * 2.5 / 100);    // 11 250
const CNSS_EMPL       = Math.round(BASE_SALARY * 16.75 / 100);  // 75 375

const NET             = BASE_SALARY + MONTANT_SUP + ANCIENNETE + NUTRITION + TRANSPORT - CNSS_SAL;
// = 450 000 + 19 178 + 22 500 + 22 000 + 44 000 - 11 250 = 546 428
const DEJA_VERSE      = NUTRITION + TRANSPORT; // 66 000
const RESTE           = NET - DEJA_VERSE;      // 480 428

async function main() {
  const payroll = await prisma.payroll.findUnique({ where: { number: 'BP-TEST-2026-05-001' } });
  if (!payroll) throw new Error('Bulletin introuvable.');

  const cnss = await prisma.payrollContribution.findUnique({ where: { code: 'CNSS_SAL_TEST' } });

  // Mise à jour de la ligne CNSS → base = 450 000 uniquement
  await prisma.payrollContributionLine.deleteMany({ where: { payrollId: payroll.id } });
  await prisma.payrollContributionLine.create({
    data: {
      payrollId:      payroll.id,
      contributionId: cnss.id,
      baseAmount:     BASE_SALARY,       // ← base salary seulement
      appliedRate:    2.5 / 100,
      amount:         CNSS_SAL,          // 11 250
    }
  });

  // Mise à jour du bulletin
  // grossSalary = base salary (450 000) — les heures sup sont calculées
  // à la volée dans le template depuis overtimeHours + hourlyRate
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: {
      grossSalary:          BASE_SALARY,     // salaire de base uniquement
      hoursWorked:          HEURES_NORMALES + HEURES_SUP, // 181 h
      overtimeHours:        HEURES_SUP,      // 5 h → affichées séparément
      totalDeductions:      CNSS_SAL,        // 11 250
      netSalary:            NET,             // 546 428
      employerCharges:      CNSS_EMPL,       // 75 375
      paidAmount:           DEJA_VERSE,      // 66 000
      remainingAmount:      RESTE,           // 480 428
    }
  });

  console.log('\n✅ Bulletin corrigé !\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         BULLETIN — MAI 2026 (VERSION FINALE)            ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  RÉMUNÉRATION                                            ║');
  console.log(`║    Salaire de base (22j)  :       450 000 FCFA          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  HEURES SUPPLÉMENTAIRES (section séparée)                ║');
  console.log(`║    5h × 2 557 × 1,5       :  +     19 178 FCFA          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  PRIMES                                                  ║');
  console.log(`║    Ancienneté 5%          :  +     22 500 FCFA          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  INDEMNITÉS (exonérées CNSS)                             ║');
  console.log(`║    Nutrition (1000×22j)   :  +     22 000 FCFA          ║`);
  console.log(`║    Transport (2000×22j)   :  +     44 000 FCFA          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  COTISATIONS SOCIALES                                    ║');
  console.log(`║    Employé  2,5% × 450 000:  -     11 250 FCFA          ║`);
  console.log(`║    Pour l'empl. 16,75%    :        75 375 FCFA          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  NET TOTAL DÛ             :       546 428 FCFA          ║`);
  console.log(`║  Déjà versé (nut+transp)  :  -     66 000 FCFA          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  ★ RESTE À PAYER FIN MOIS :       480 428 FCFA          ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n🔗 http://localhost:3000/api/payroll/print?ids=' + payroll.id);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
