/**
 * SCRIPT DE DONNÉES DE TEST — BULLETIN DE PAIE FICTIF
 * ====================================================
 * Crée un employé fictif + bulletin complet avec calculs gabonais réels
 *
 * Scénario :
 *   Employé  : Jean-Baptiste MBOUMBA — Comptable, CDI
 *   Salaire  : 450 000 FCFA / mois
 *   Période  : Mai 2026 (22 jours ouvrés)
 *   Présence : 22 jours / 176 heures (mois complet)
 *
 * Rubriques :
 *   - Prime de rendement : 10% du brut = 45 000 FCFA (soumise CNSS)
 *   - Indemnité transport: 30 000 FCFA (exonérée CNSS jusqu'à 30 000)
 *
 * Cotisations (droit gabonais) :
 *   - CNSS salariale  : 2,5 %  × (450 000 + 45 000)   = 12 375 FCFA
 *   - TRIMF           : forfait 1 000 FCFA
 *
 * Charges patronales :
 *   - CNSS patronale  : 16,75 % × 450 000              = 75 375 FCFA
 *
 * NET À PAYER = 450 000 + 45 000 + 30 000 − 12 375 − 1 000 = 511 625 FCFA
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ─── Constantes ──────────────────────────────────────────────────────────────
const BASE_SALARY       = 450_000;   // FCFA
const PRIME_RENDEMENT   =  45_000;   // 10 % brut
const IND_TRANSPORT     =  30_000;   // exonérée
const JOURS_TRAVAILLES  = 22;
const HEURES_TRAVAILLES = 176;       // 22 j × 8 h
const JOURS_ATTENDUS    = 22;

// Cotisations employé
const CNSS_TAUX         = 2.5;       // % sur brut imposable
const TRIMF_MONTANT     = 1_000;     // forfait fixe

// Charges patronales
const CNSS_PATRON_TAUX  = 16.75;     // %

// Calculs
const BRUT_IMPOSABLE    = BASE_SALARY + PRIME_RENDEMENT;     // 495 000 (transport exonéré)
const CNSS_MONTANT      = Math.round(BRUT_IMPOSABLE * CNSS_TAUX / 100);  // 12 375
const TOTAL_RETENUES    = CNSS_MONTANT + TRIMF_MONTANT;                  // 13 375
const PATRONAL_MONTANT  = Math.round(BASE_SALARY * CNSS_PATRON_TAUX / 100); // 75 375
const NET_SALAIRE       = BASE_SALARY + PRIME_RENDEMENT + IND_TRANSPORT - TOTAL_RETENUES; // 511 625

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         CRÉATION DONNÉES TEST — BULLETIN DE PAIE             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 0. Récupérer un admin pour les relations obligatoires
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  if (!admin) throw new Error('Aucun utilisateur actif trouvé pour les relations.');
  console.log('✓ Admin référence :', admin.firstName, admin.lastName);

  // ─── 1. Créer l'utilisateur fictif ──────────────────────────────────────────
  const existingUser = await prisma.user.findUnique({ where: { email: 'jb.mboumba.test@campgaul.ga' } });
  let testUser;

  if (existingUser) {
    testUser = existingUser;
    console.log('✓ Utilisateur existant :', testUser.firstName, testUser.lastName);
  } else {
    const hashedPwd = await bcrypt.hash('Test1234!', 10);
    testUser = await prisma.user.create({
      data: {
        email:     'jb.mboumba.test@campgaul.ga',
        firstName: 'Jean-Baptiste',
        lastName:  'MBOUMBA',
        name:      'Jean-Baptiste MBOUMBA',
        password:  hashedPwd,
        matricule: 'MAT-TEST-001',
        status:    'ACTIVE',
      }
    });
    console.log('✓ Utilisateur créé :', testUser.firstName, testUser.lastName, '— ID:', testUser.id);
  }

  // ─── 2. Créer/récupérer les cotisations ─────────────────────────────────────
  // CNSS salariale (part employé)
  let cnss = await prisma.payrollContribution.findUnique({ where: { code: 'CNSS_SAL_TEST' } });
  if (!cnss) {
    cnss = await prisma.payrollContribution.create({
      data: {
        name:            'CNSS (part salariale)',
        code:            'CNSS_SAL_TEST',
        description:     'Cotisation CNSS salariale — 2,5 % du brut (droit gabonais)',
        rate:            CNSS_TAUX,
        isEmployeeShare: true,
        isEmployerShare: false,
        declaredOnly:    true,
        displayOrder:    1,
        isActive:        true,
      }
    });
    console.log('✓ Cotisation CNSS créée');
  } else {
    console.log('✓ Cotisation CNSS existante');
  }

  // TRIMF (forfait)
  let trimf = await prisma.payrollContribution.findUnique({ where: { code: 'TRIMF_TEST' } });
  if (!trimf) {
    trimf = await prisma.payrollContribution.create({
      data: {
        name:            'TRIMF',
        code:            'TRIMF_TEST',
        description:     'Taxe de Résidence — forfait 1 000 FCFA/mois',
        rate:            0,    // géré via montant fixe dans la ligne
        isEmployeeShare: true,
        isEmployerShare: false,
        declaredOnly:    false,
        displayOrder:    2,
        isActive:        true,
      }
    });
    console.log('✓ Cotisation TRIMF créée');
  }

  // CNSS patronale (charge employeur)
  let cnssPatron = await prisma.payrollContribution.findUnique({ where: { code: 'CNSS_PAT_TEST' } });
  if (!cnssPatron) {
    cnssPatron = await prisma.payrollContribution.create({
      data: {
        name:            'CNSS (part patronale)',
        code:            'CNSS_PAT_TEST',
        description:     'Cotisation CNSS patronale — 16,75 % (droit gabonais)',
        rate:            CNSS_PATRON_TAUX,
        isEmployeeShare: false,
        isEmployerShare: true,
        declaredOnly:    true,
        displayOrder:    3,
        isActive:        true,
      }
    });
    console.log('✓ Cotisation CNSS patronale créée');
  }

  // ─── 3. Créer les rubriques ──────────────────────────────────────────────────
  // Prime de rendement
  let primeRub = await prisma.payrollRubric.findUnique({ where: { code: 'PRIME_REND_TEST' } });
  if (!primeRub) {
    primeRub = await prisma.payrollRubric.create({
      data: {
        code:              'PRIME_REND_TEST',
        name:              'Prime de rendement',
        description:       '10 % du salaire brut — soumise aux cotisations',
        type:              'PRIME',
        isSubjectToTax:    true,
        isSubjectToSocial: true,
        calculationBase:   'BASE_SALARY',
        defaultRate:       10,
        displayOrder:      1,
        isActive:          true,
      }
    });
    console.log('✓ Rubrique Prime de rendement créée');
  }

  // Indemnité transport
  let indTransp = await prisma.payrollRubric.findUnique({ where: { code: 'IND_TRANSP_TEST' } });
  if (!indTransp) {
    indTransp = await prisma.payrollRubric.create({
      data: {
        code:              'IND_TRANSP_TEST',
        name:              'Indemnité de transport',
        description:       '30 000 FCFA — entièrement exonérée de cotisations',
        type:              'INDEMNITY',
        isSubjectToTax:    false,
        isSubjectToSocial: false,
        calculationBase:   'FIXED',
        defaultAmount:     IND_TRANSPORT,
        exemptionCeiling:  IND_TRANSPORT,
        displayOrder:      2,
        isActive:          true,
      }
    });
    console.log('✓ Rubrique Indemnité transport créée');
  }

  // ─── 4. Créer le profil paie de l'employé ────────────────────────────────────
  let profile = await prisma.employeePayrollProfile.findUnique({ where: { userId: testUser.id } });
  if (!profile) {
    profile = await prisma.employeePayrollProfile.create({
      data: {
        userId:              testUser.id,
        employeeType:        'DECLARED',
        contractType:        'CDI',
        baseSalary:          BASE_SALARY,
        salaryIsNet:         false,
        workingDaysPattern:  ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'],
        workingHoursPerDay:  8,
        dailyRate:           Math.round(BASE_SALARY / 22),
        hourlyRate:          Math.round(BASE_SALARY / (22 * 8)),
        overtimeRate:        1.5,
        position:            'Comptable',
        hireDate:            new Date('2024-03-01'),
        isActive:            true,
      }
    });
    console.log('✓ Profil paie créé');
  } else {
    console.log('✓ Profil paie existant');
  }

  // ─── 5. Lier les cotisations au profil ───────────────────────────────────────
  for (const contrib of [cnss, trimf, cnssPatron]) {
    const exists = await prisma.employeeContribution.findUnique({
      where: { employeeProfileId_contributionId: { employeeProfileId: profile.id, contributionId: contrib.id } }
    });
    if (!exists) {
      await prisma.employeeContribution.create({
        data: { employeeProfileId: profile.id, contributionId: contrib.id, isActive: true }
      });
    }
  }
  console.log('✓ Cotisations liées au profil');

  // ─── 6. Lier les rubriques au profil ─────────────────────────────────────────
  for (const rubric of [primeRub, indTransp]) {
    const exists = await prisma.employeeRubric.findUnique({
      where: { employeeProfileId_rubricId: { employeeProfileId: profile.id, rubricId: rubric.id } }
    });
    if (!exists) {
      await prisma.employeeRubric.create({
        data: {
          employeeProfileId: profile.id,
          rubricId:          rubric.id,
          isActive:          true,
          createdById:       admin.id,
        }
      });
    }
  }
  console.log('✓ Rubriques liées au profil');

  // ─── 7. Créer la période de paie ──────────────────────────────────────────────
  let period = await prisma.payrollPeriod.findFirst({ where: { name: 'Mai 2026 (TEST)' } });
  if (!period) {
    period = await prisma.payrollPeriod.create({
      data: {
        name:        'Mai 2026 (TEST)',
        periodType:  'MONTHLY',
        startDate:   new Date('2026-05-01'),
        endDate:     new Date('2026-05-31'),
        workingDays: JOURS_ATTENDUS,
        isClosed:    false,
      }
    });
    console.log('✓ Période "Mai 2026 (TEST)" créée');
  } else {
    console.log('✓ Période existante');
  }

  // ─── 8. Créer le bulletin de paie ─────────────────────────────────────────────
  const bulletinNumber = 'BP-TEST-2026-05-001';
  let payroll = await prisma.payroll.findUnique({ where: { number: bulletinNumber } });

  if (!payroll) {
    payroll = await prisma.payroll.create({
      data: {
        number:             bulletinNumber,
        employeeProfileId:  profile.id,
        periodId:           period.id,
        // Présence
        daysWorked:         JOURS_TRAVAILLES,
        hoursWorked:        HEURES_TRAVAILLES,
        overtimeHours:      0,
        absenceDays:        0,
        rawDaysWorked:      JOURS_TRAVAILLES,
        rawHoursWorked:     HEURES_TRAVAILLES,
        expectedWorkingDays:JOURS_ATTENDUS,
        // Montants
        grossSalary:        BASE_SALARY,
        totalDeductions:    TOTAL_RETENUES,
        totalBonuses:       0,
        netSalary:          NET_SALAIRE,
        employerCharges:    PATRONAL_MONTANT,
        // Statut
        status:             'VALIDATED',
        validatedById:      admin.id,
        validatedAt:        new Date(),
        // Paiement
        paidAmount:         0,
        remainingAmount:    NET_SALAIRE,
      }
    });
    console.log('✓ Bulletin créé :', bulletinNumber);
  } else {
    console.log('✓ Bulletin existant');
  }

  // ─── 9. Créer les lignes de cotisations ───────────────────────────────────────
  const existingContribLines = await prisma.payrollContributionLine.findMany({ where: { payrollId: payroll.id } });
  if (existingContribLines.length === 0) {
    // CNSS salariale — 2,5 % × 495 000 = 12 375
    await prisma.payrollContributionLine.create({
      data: {
        payrollId:      payroll.id,
        contributionId: cnss.id,
        baseAmount:     BRUT_IMPOSABLE,
        appliedRate:    CNSS_TAUX / 100,
        amount:         CNSS_MONTANT,
      }
    });
    // TRIMF — forfait 1 000
    await prisma.payrollContributionLine.create({
      data: {
        payrollId:      payroll.id,
        contributionId: trimf.id,
        baseAmount:     0,
        appliedRate:    0,
        amount:         TRIMF_MONTANT,
      }
    });
    console.log('✓ Lignes de cotisations créées');
  }

  // ─── 10. Créer les lignes de rubriques ────────────────────────────────────────
  const existingRubricLines = await prisma.payrollRubricLine.findMany({ where: { payrollId: payroll.id } });
  if (existingRubricLines.length === 0) {
    // Prime de rendement
    await prisma.payrollRubricLine.create({
      data: {
        payrollId:         payroll.id,
        rubricId:          primeRub.id,
        rubricCode:        primeRub.code,
        rubricName:        primeRub.name,
        rubricType:        'PRIME',
        baseAmount:        BASE_SALARY,
        rate:              10,
        amount:            PRIME_RENDEMENT,
        isSubjectToTax:    true,
        isSubjectToSocial: true,
        exemptAmount:      0,
        taxableAmount:     PRIME_RENDEMENT,
      }
    });
    // Indemnité transport
    await prisma.payrollRubricLine.create({
      data: {
        payrollId:         payroll.id,
        rubricId:          indTransp.id,
        rubricCode:        indTransp.code,
        rubricName:        indTransp.name,
        rubricType:        'INDEMNITY',
        baseAmount:        IND_TRANSPORT,
        rate:              null,
        amount:            IND_TRANSPORT,
        isSubjectToTax:    false,
        isSubjectToSocial: false,
        exemptAmount:      IND_TRANSPORT,
        taxableAmount:     0,
      }
    });
    console.log('✓ Lignes de rubriques créées');
  }

  // ─── 11. Résumé des calculs ────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              RÉCAPITULATIF DES CALCULS                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Employé          : Jean-Baptiste MBOUMBA                    ║`);
  console.log(`║  Poste            : Comptable — CDI                          ║`);
  console.log(`║  Période          : Mai 2026 (22 jours)                      ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Salaire de base  :           ${String(BASE_SALARY.toLocaleString('fr')+' FCFA').padStart(16)}              ║`);
  console.log(`║  + Prime rend.    :           ${String(PRIME_RENDEMENT.toLocaleString('fr')+' FCFA').padStart(16)}              ║`);
  console.log(`║  + Ind. transport :           ${String(IND_TRANSPORT.toLocaleString('fr')+' FCFA').padStart(16)}              ║`);
  console.log(`║  = BRUT TOTAL     :           ${String((BASE_SALARY+PRIME_RENDEMENT+IND_TRANSPORT).toLocaleString('fr')+' FCFA').padStart(16)}              ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  - CNSS (2,5%)    :              -' + String(CNSS_MONTANT.toLocaleString('fr') + ' FCFA').padEnd(15) + '          ║');
  console.log('║  - TRIMF forfait  :               -' + String(TRIMF_MONTANT.toLocaleString('fr') + ' FCFA').padEnd(14) + '          ║');
  console.log('║  = TOTAL RETENUES :              -' + String(TOTAL_RETENUES.toLocaleString('fr') + ' FCFA').padEnd(15) + '          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  ★ NET À PAYER    :           ${String(NET_SALAIRE.toLocaleString('fr')+' FCFA').padStart(16)}              ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Charges patronal.:          +${String(PATRONAL_MONTANT.toLocaleString('fr')+' FCFA').padStart(16)}              ║`);
  console.log(`║  (CNSS 16,75%)    :         (info — non déduit du net)       ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log('\n══════════ URL DU BULLETIN À OUVRIR ══════════');
  console.log('http://localhost:3000/api/payroll/print?ids=' + payroll.id);
  console.log('');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
