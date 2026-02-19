import { prisma } from "@/lib/prisma"
import {
  EmployeeType,
  ContractType,
  AdjustmentType,
  PayrollStatus,
  RubricType,
  RubricCalculationBase,
} from "@prisma/client"

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceSummary {
  totalHours: number
  daysWorked: number
  avgHoursPerDay: number
  dailyLogs: Array<{
    date: string
    checkIn: Date | null
    checkOut: Date | null
    hours: number
    isManual: boolean
  }>
}

export interface ContributionLine {
  contributionId: string
  name: string
  code: string
  baseAmount: number
  rate: number
  amount: number
  isEmployeeShare: boolean
  isEmployerShare: boolean
}

export interface RubricLine {
  rubricId: string
  rubricCode: string
  rubricName: string
  rubricType: RubricType
  baseAmount: number
  rate: number | null
  amount: number
  isSubjectToTax: boolean
  isSubjectToSocial: boolean
  exemptAmount: number
  taxableAmount: number
}

export interface PayrollCalculationInput {
  employeeProfileId: string
  periodId: string
  attendanceData: AttendanceSummary
}

export interface PayrollCalculationResult {
  // Données de temps
  rawDaysWorked: number
  rawHoursWorked: number
  daysWorked: number
  hoursWorked: number
  overtimeHours: number
  absenceDays: number
  expectedWorkingDays: number // Jours ouvrés attendus pour cet employé

  // Montants
  grossSalary: number
  totalDeductions: number
  totalBonuses: number
  totalPrimes: number      // Total des primes (rubriques)
  totalIndemnities: number // Total des indemnités (rubriques)
  netSalary: number
  employerCharges: number

  // Détail des cotisations
  contributionLines: ContributionLine[]

  // Détail des rubriques (primes et indemnités)
  rubricLines: RubricLine[]

  // Ajustements appliqués
  appliedAdjustments: Array<{
    id: string
    type: AdjustmentType
    description: string
    amount: number
  }>
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Récupère les données de pointage d'un employé pour une période donnée
 */
export async function getAttendanceData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AttendanceSummary> {
  const logs = await prisma.attendanceLog.findMany({
    where: {
      userId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
    select: {
      id: true,
      type: true,
      method: true,
      timestamp: true,
    },
  })

  // Grouper les logs par jour
  const dailyLogs: Record<
    string,
    {
      date: string
      checkIn: Date | null
      checkOut: Date | null
      hours: number
      isManual: boolean
    }
  > = {}

  logs.forEach((log) => {
    const dateKey = new Date(log.timestamp).toISOString().split("T")[0]

    if (!dailyLogs[dateKey]) {
      dailyLogs[dateKey] = {
        date: dateKey,
        checkIn: null,
        checkOut: null,
        hours: 0,
        isManual: false,
      }
    }

    if (log.type === "CHECK_IN" && !dailyLogs[dateKey].checkIn) {
      dailyLogs[dateKey].checkIn = log.timestamp
      if (log.method === "MANUAL") {
        dailyLogs[dateKey].isManual = true
      }
    } else if (log.type === "CHECK_OUT") {
      dailyLogs[dateKey].checkOut = log.timestamp
      if (log.method === "MANUAL") {
        dailyLogs[dateKey].isManual = true
      }
    }
  })

  // Calculer les heures travaillées pour chaque jour
  let totalHours = 0
  let daysWorked = 0

  Object.values(dailyLogs).forEach((day) => {
    if (day.checkIn && day.checkOut) {
      const hours =
        (new Date(day.checkOut).getTime() - new Date(day.checkIn).getTime()) /
        (1000 * 60 * 60)
      day.hours = Math.round(hours * 100) / 100
      totalHours += day.hours
      daysWorked++
    }
  })

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    daysWorked,
    avgHoursPerDay:
      daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
    dailyLogs: Object.values(dailyLogs).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  }
}

/**
 * Calcule le nombre de jours ouvrés dans le mois basé sur le pattern de l'employé
 */
export function calculateWorkingDaysInPeriod(
  startDate: Date,
  endDate: Date,
  workingDaysPattern: string[]
): number {
  const dayMapping: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  }

  const workingDayNumbers = workingDaysPattern.map(day => dayMapping[day])
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    if (workingDayNumbers.includes(current.getDay())) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Calcule le salaire brut selon le type de contrat et les heures travaillées
 */
export function calculateGrossSalary(
  profile: {
    contractType: ContractType
    baseSalary: number
    dailyRate: number | null
    hourlyRate: number | null
    workingDaysPattern: string[]
    workingHoursPerDay: number
  },
  daysWorked: number,
  hoursWorked: number,
  overtimeHours: number,
  overtimeRate: number,
  expectedWorkingDays: number
): number {
  let grossSalary = 0

  // Si 0 heures travaillées, pas de salaire
  if (hoursWorked <= 0 && daysWorked <= 0) {
    return 0
  }

  switch (profile.contractType) {
    case "CDI":
    case "CDD":
      // Salaire mensuel : prorata des heures travaillées
      const expectedHours = expectedWorkingDays * profile.workingHoursPerDay
      if (expectedHours > 0) {
        // Calcul au prorata des heures
        grossSalary = (profile.baseSalary / expectedHours) * hoursWorked
        // Ajouter les heures supplémentaires
        if (overtimeHours > 0) {
          const hourlyRate = profile.baseSalary / expectedHours
          grossSalary += overtimeHours * hourlyRate * (overtimeRate - 1)
        }
      }
      break

    case "STAGE":
      // Stagiaire : gratification au prorata
      if (expectedWorkingDays > 0) {
        grossSalary = (profile.baseSalary / expectedWorkingDays) * daysWorked
      }
      break

    case "INTERIM":
      // Intérim : paiement à la journée ou à l'heure
      if (profile.dailyRate) {
        grossSalary = profile.dailyRate * daysWorked
      } else if (profile.hourlyRate) {
        grossSalary = profile.hourlyRate * hoursWorked
      } else {
        grossSalary = (profile.baseSalary / expectedWorkingDays) * daysWorked
      }
      break

    case "FREELANCE":
      // Freelance : paiement à l'heure ou forfait
      if (profile.hourlyRate) {
        grossSalary = profile.hourlyRate * hoursWorked
      } else if (profile.dailyRate) {
        grossSalary = profile.dailyRate * daysWorked
      } else {
        grossSalary = profile.baseSalary
      }
      break

    default:
      // Par défaut : prorata des heures
      const defaultExpectedHours = expectedWorkingDays * profile.workingHoursPerDay
      if (defaultExpectedHours > 0) {
        grossSalary = (profile.baseSalary / defaultExpectedHours) * hoursWorked
      }
  }

  return Math.round(grossSalary * 100) / 100
}

/**
 * Calcule les cotisations sociales
 */
export function calculateContributions(
  grossSalary: number,
  contributions: Array<{
    id: string
    name: string
    code: string
    rate: number
    ceiling: number | null
    isEmployeeShare: boolean
    isEmployerShare: boolean
  }>
): { employeeContributions: ContributionLine[]; employerContributions: ContributionLine[] } {
  const employeeContributions: ContributionLine[] = []
  const employerContributions: ContributionLine[] = []

  contributions.forEach((contribution) => {
    // Appliquer le plafond si défini
    const baseAmount = contribution.ceiling
      ? Math.min(grossSalary, contribution.ceiling)
      : grossSalary

    const amount = Math.round((baseAmount * contribution.rate) / 100 * 100) / 100

    const line: ContributionLine = {
      contributionId: contribution.id,
      name: contribution.name,
      code: contribution.code,
      baseAmount,
      rate: contribution.rate,
      amount,
      isEmployeeShare: contribution.isEmployeeShare,
      isEmployerShare: contribution.isEmployerShare,
    }

    if (contribution.isEmployeeShare) {
      employeeContributions.push(line)
    }
    if (contribution.isEmployerShare) {
      employerContributions.push(line)
    }
  })

  return { employeeContributions, employerContributions }
}

/**
 * Calcule les heures supplémentaires
 */
export function calculateOvertimeHours(
  hoursWorked: number,
  daysWorked: number,
  workingHoursPerDay: number
): number {
  const expectedHours = daysWorked * workingHoursPerDay
  const overtime = hoursWorked - expectedHours
  return overtime > 0 ? Math.round(overtime * 100) / 100 : 0
}

// ============================================================================
// FONCTION PRINCIPALE DE CALCUL
// ============================================================================

/**
 * Calcule un bulletin de paie complet
 */
export async function calculatePayroll(
  input: PayrollCalculationInput
): Promise<PayrollCalculationResult> {
  // 1. Récupérer le profil employé avec ses cotisations et rubriques assignées
  const profile = await prisma.employeePayrollProfile.findUnique({
    where: { id: input.employeeProfileId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      contributions: {
        where: { isActive: true },
        include: {
          contribution: true,
        },
      },
      rubrics: {
        where: { isActive: true },
        include: {
          rubric: true,
        },
      },
    },
  })

  if (!profile) {
    throw new Error("Profil employé non trouvé")
  }

  // 2. Récupérer la période
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: input.periodId },
  })

  if (!period) {
    throw new Error("Période de paie non trouvée")
  }

  // 3. Calculer le nombre de jours ouvrés attendus pour cette période selon le pattern de l'employé
  const expectedWorkingDays = calculateWorkingDaysInPeriod(
    period.startDate,
    period.endDate,
    profile.workingDaysPattern
  )

  // 4. Récupérer les ajustements (récurrents du profil + ponctuels)
  const adjustments = await prisma.payrollAdjustment.findMany({
    where: {
      OR: [
        { employeeProfileId: input.employeeProfileId, isRecurring: true },
        { payrollId: null, employeeProfileId: input.employeeProfileId },
      ],
    },
  })

  // 5. Données de pointage brutes
  const rawDaysWorked = input.attendanceData.daysWorked
  const rawHoursWorked = input.attendanceData.totalHours

  // 6. Appliquer les ajustements d'absence
  let absenceDays = 0
  let absenceHours = 0
  adjustments
    .filter((a) => a.type === "ABSENCE")
    .forEach((a) => {
      absenceDays += a.daysAffected || 0
      absenceHours += a.hoursAffected || 0
    })

  const daysWorked = Math.max(0, rawDaysWorked - absenceDays)
  const hoursWorked = Math.max(0, rawHoursWorked - absenceHours)

  // 7. Calculer les heures supplémentaires
  const overtimeHours = calculateOvertimeHours(
    hoursWorked,
    daysWorked,
    profile.workingHoursPerDay
  )

  // 8. Calculer le salaire brut basé sur les heures travaillées
  const grossSalary = calculateGrossSalary(
    {
      contractType: profile.contractType,
      baseSalary: profile.baseSalary,
      dailyRate: profile.dailyRate,
      hourlyRate: profile.hourlyRate,
      workingDaysPattern: profile.workingDaysPattern,
      workingHoursPerDay: profile.workingHoursPerDay,
    },
    daysWorked,
    hoursWorked,
    overtimeHours,
    profile.overtimeRate,
    expectedWorkingDays
  )

  // 9. Calculer les cotisations UNIQUEMENT si l'employé a des cotisations assignées
  let contributionLines: ContributionLine[] = []
  let totalDeductions = 0
  let employerCharges = 0

  // Utiliser les cotisations assignées à l'employé (via EmployeeContribution)
  if (profile.contributions && profile.contributions.length > 0) {
    const assignedContributions = profile.contributions.map((ec) => ({
      id: ec.contribution.id,
      name: ec.contribution.name,
      code: ec.contribution.code,
      rate: ec.customRate ?? ec.contribution.rate, // Utiliser le taux personnalisé si défini
      ceiling: ec.contribution.ceiling,
      isEmployeeShare: ec.contribution.isEmployeeShare,
      isEmployerShare: ec.contribution.isEmployerShare,
    }))

    const { employeeContributions, employerContributions } = calculateContributions(
      grossSalary,
      assignedContributions
    )

    contributionLines = employeeContributions
    totalDeductions = employeeContributions.reduce((sum, c) => sum + c.amount, 0)
    employerCharges = employerContributions.reduce((sum, c) => sum + c.amount, 0)
  }

  // 10. Calculer les primes et retenues manuelles (ajustements)
  let totalBonuses = 0
  let totalPenalties = 0

  adjustments.forEach((a) => {
    switch (a.type) {
      case "BONUS":
      case "OVERTIME":
        totalBonuses += a.amount
        break
      case "DEDUCTION":
      case "ADVANCE":
        totalPenalties += Math.abs(a.amount)
        break
      case "ABSENCE":
        // Déjà traité dans les jours/heures
        break
      case "OTHER":
        if (a.amount > 0) {
          totalBonuses += a.amount
        } else {
          totalPenalties += Math.abs(a.amount)
        }
        break
    }
  })

  // 11. Calculer les rubriques (primes et indemnités)
  let rubricLines: RubricLine[] = []
  let totalPrimes = 0
  let totalIndemnities = 0
  let rubricSocialContributions = 0 // Cotisations supplémentaires sur rubriques

  if (profile.rubrics && profile.rubrics.length > 0) {
    for (const employeeRubric of profile.rubrics) {
      const rubric = employeeRubric.rubric
      
      // Vérifier la période d'application
      const now = new Date()
      if (employeeRubric.startDate && new Date(employeeRubric.startDate) > now) continue
      if (employeeRubric.endDate && new Date(employeeRubric.endDate) < now) continue

      // Calculer le montant selon la base de calcul
      let baseAmount = 0
      let calculatedAmount = 0
      let appliedRate: number | null = null

      switch (rubric.calculationBase) {
        case "FIXED":
          calculatedAmount = employeeRubric.amount ?? rubric.defaultAmount ?? 0
          baseAmount = calculatedAmount
          break
        case "GROSS_SALARY":
          baseAmount = grossSalary
          appliedRate = employeeRubric.rate ?? rubric.defaultRate ?? 0
          calculatedAmount = Math.round((baseAmount * appliedRate / 100) * 100) / 100
          break
        case "BASE_SALARY":
          baseAmount = profile.baseSalary
          appliedRate = employeeRubric.rate ?? rubric.defaultRate ?? 0
          calculatedAmount = Math.round((baseAmount * appliedRate / 100) * 100) / 100
          break
        case "NET_SALARY":
          // Calcul préliminaire du net (sera ajusté)
          baseAmount = grossSalary - totalDeductions
          appliedRate = employeeRubric.rate ?? rubric.defaultRate ?? 0
          calculatedAmount = Math.round((baseAmount * appliedRate / 100) * 100) / 100
          break
      }

      // Calculer les montants exonérés et imposables
      let exemptAmount = 0
      let taxableAmount = calculatedAmount

      if (rubric.exemptionCeiling && rubric.exemptionCeiling > 0) {
        exemptAmount = Math.min(calculatedAmount, rubric.exemptionCeiling)
        taxableAmount = Math.max(0, calculatedAmount - rubric.exemptionCeiling)
      }

      // Ajouter la ligne de rubrique
      rubricLines.push({
        rubricId: rubric.id,
        rubricCode: rubric.code,
        rubricName: rubric.name,
        rubricType: rubric.type,
        baseAmount,
        rate: appliedRate,
        amount: calculatedAmount,
        isSubjectToTax: rubric.isSubjectToTax,
        isSubjectToSocial: rubric.isSubjectToSocial,
        exemptAmount,
        taxableAmount,
      })

      // Cumuler les totaux par type
      if (rubric.type === "PRIME") {
        totalPrimes += calculatedAmount
      } else {
        totalIndemnities += calculatedAmount
      }

      // Si soumis aux cotisations, calculer les cotisations supplémentaires
      // (simplifié : on applique le même taux global de cotisations)
      if (rubric.isSubjectToSocial && taxableAmount > 0) {
        const socialRate = contributionLines.reduce((sum, c) => sum + c.rate, 0)
        rubricSocialContributions += Math.round((taxableAmount * socialRate / 100) * 100) / 100
      }
    }
  }

  // 12. Calculer le salaire net final
  // Net = Brut - Cotisations + Primes + Indemnités + Bonus - Pénalités - Cotisations sur rubriques
  const netSalary = Math.round(
    (grossSalary - totalDeductions + totalPrimes + totalIndemnities + totalBonuses - totalPenalties - rubricSocialContributions) * 100
  ) / 100

  // 13. Préparer les ajustements appliqués
  const appliedAdjustments = adjustments.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    amount: a.amount,
  }))

  return {
    rawDaysWorked,
    rawHoursWorked,
    daysWorked,
    hoursWorked,
    overtimeHours,
    absenceDays,
    expectedWorkingDays,
    grossSalary,
    totalDeductions: Math.round((totalDeductions + rubricSocialContributions) * 100) / 100,
    totalBonuses: Math.round(totalBonuses * 100) / 100,
    totalPrimes: Math.round(totalPrimes * 100) / 100,
    totalIndemnities: Math.round(totalIndemnities * 100) / 100,
    netSalary: Math.max(0, netSalary),
    employerCharges: Math.round(employerCharges * 100) / 100,
    contributionLines,
    rubricLines,
    appliedAdjustments,
  }
}

/**
 * Génère un numéro de bulletin unique
 */
export async function generatePayrollNumber(periodName: string, index: number): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, "0")
  const prefix = `BP-${year}-${month}-`
  
  // Trouver le numéro le plus élevé existant pour ce préfixe
  const lastPayroll = await prisma.payroll.findFirst({
    where: {
      number: { startsWith: prefix },
    },
    orderBy: { number: "desc" },
    select: { number: true },
  })
  
  let nextSeq = index
  if (lastPayroll) {
    const lastSeq = parseInt(lastPayroll.number.replace(prefix, ""), 10)
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + index
    }
  }
  
  return `${prefix}${String(nextSeq).padStart(3, "0")}`
}

/**
 * Calcule les taux journalier et horaire à partir du salaire de base
 */
export function calculateRates(
  baseSalary: number,
  workingDaysPerMonth: number,
  workingHoursPerDay: number
): { dailyRate: number; hourlyRate: number } {
  const dailyRate = Math.round((baseSalary / workingDaysPerMonth) * 100) / 100
  const hourlyRate = Math.round((dailyRate / workingHoursPerDay) * 100) / 100
  return { dailyRate, hourlyRate }
}
