/**
 * Correction finale :
 * - Suppression du TRIMF (pas applicable)
 * - CNSS salariale 2,5% uniquement
 * - CNSS Employeur 16,75% visible
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JOURS          = 22;
const BASE_SALARY    = 450_000;
const TOTAL_NUTRITION = 1_000 * JOURS;  // 22 000
const TOTAL_TRANSPORT = 2_000 * JOURS;  // 44 000
const TOTAL_INDEMNITES = TOTAL_NUTRITION + TOTAL_TRANSPORT; // 66 000

// Sans TRIMF
const CNSS_TAUX       = 2.5;
const CNSS_MONTANT    = Math.round(BASE_SALARY * CNSS_TAUX / 100); // 11 250
const TOTAL_RETENUES  = CNSS_MONTANT; // 11 250 (plus de TRIMF)

const CNSS_PATRON_MONTANT = Math.round(BASE_SALARY * 16.75 / 100); // 75 375

const NET          = BASE_SALARY + TOTAL_INDEMNITES - TOTAL_RETENUES; // 504 750
const DEJA_VERSE   = TOTAL_INDEMNITES; // 66 000
const RESTE        = NET - DEJA_VERSE; // 438 750

async function main() {
  const payroll = await prisma.payroll.findUnique({ where: { number: 'BP-TEST-2026-05-001' } });
  if (!payroll) throw new Error('Bulletin introuvable.');

  // Supprimer la ligne TRIMF des cotisations du bulletin
  const trimf = await prisma.payrollContribution.findUnique({ where: { code: 'TRIMF_TEST' } });
  if (trimf) {
    await prisma.payrollContributionLine.deleteMany({
      where: { payrollId: payroll.id, contributionId: trimf.id }
    });
  }

  // Mettre à jour les montants
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: {
      totalDeductions:  TOTAL_RETENUES,
      netSalary:        NET,
      employerCharges:  CNSS_PATRON_MONTANT,
      paidAmount:       DEJA_VERSE,
      remainingAmount:  RESTE,
    }
  });

  console.log('\n✅ TRIMF supprimé — bulletin recalculé\n');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║         BULLETIN FINAL — MAI 2026                   ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Salaire de base         :       450 000 FCFA       ║');
  console.log('║  + Nutrition (1000×22j)  :  +     22 000 FCFA       ║');
  console.log('║  + Transport (2000×22j)  :  +     44 000 FCFA       ║');
  console.log('║  = Brut total            :       516 000 FCFA       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  RETENUE EMPLOYÉ                                     ║');
  console.log('║  - CNSS salariale 2,5%   :  -     11 250 FCFA       ║');
  console.log('║    (sur 450 000 — ind. exonérées)                    ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  NET TOTAL DÛ            :       504 750 FCFA       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Nutrition déjà versée   :  -     22 000 FCFA       ║');
  console.log('║  Transport déjà versé    :  -     44 000 FCFA       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  ★ RESTE À PAYER FIN MOIS:       438 750 FCFA       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  CNSS EMPLOYEUR (16,75%) :  +     75 375 FCFA       ║');
  console.log('║  → Cotisation de l\'entreprise à la CNSS              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\n🔗 Bulletin : http://localhost:3000/api/payroll/print?ids=' + payroll.id);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
