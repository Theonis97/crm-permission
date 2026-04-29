/**
 * Fenêtre de déclaration des ventes livreur : même journée civile jusqu'à 23:59:59.999
 * dans un fuseau fixe (défaut : UTC+1, type Afrique centrale / Cameroun sans heure d'été).
 *
 * Ajuster avec DRIVER_DECLARATION_UTC_OFFSET_HOURS (nombre d'heures à ajouter à UTC pour obtenir l'heure locale métier).
 *
 * Ventes d’un jour passé : saisie rétroactive avec champ saleDate (AAAA-MM-JJ), dans la limite de
 * DRIVER_SALES_BACKFILL_MAX_DAYS (défaut : 7) jours calendaires avant aujourd’hui.
 */
const OFFSET_MS =
  (Number(process.env.DRIVER_DECLARATION_UTC_OFFSET_HOURS) || 1) * 60 * 60 * 1000

export type DeclarationDayBounds = {
  /** Instant début de journée métier (inclus) */
  dayStart: Date
  /** Instant fin 23:59:59.999 journée métier (inclus) */
  deadline: Date
}

/**
 * Bornes de la journée civile « métier » pour l'instant `now`.
 */
export function getDeclarationDayBounds(now: Date = new Date()): DeclarationDayBounds {
  const shifted = now.getTime() + OFFSET_MS
  const u = new Date(shifted)
  const y = u.getUTCFullYear()
  const m = u.getUTCMonth()
  const d = u.getUTCDate()
  const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - OFFSET_MS)
  const deadline = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - OFFSET_MS)
  return { dayStart, deadline }
}

export function isDeclarationWindowOpen(now: Date = new Date()): boolean {
  const { deadline } = getDeclarationDayBounds(now)
  return now.getTime() <= deadline.getTime()
}

/** Clé calendaire AAAA-MM-JJ dans le fuseau métier (pour un instant UTC). */
export function getBusinessDateKeyFromInstant(now: Date): string {
  const shifted = now.getTime() + OFFSET_MS
  const u = new Date(shifted)
  const y = u.getUTCFullYear()
  const m = u.getUTCMonth() + 1
  const d = u.getUTCDate()
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function subtractOneCalendarDayFromKey(key: string): string {
  const [y, mo, d] = key.split("-").map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
}

/** Hier (jour calendaire métier précédent). */
export function getYesterdayBusinessDateKey(now: Date = new Date()): string {
  const { dayStart } = getDeclarationDayBounds(now)
  return getBusinessDateKeyFromInstant(new Date(dayStart.getTime() - 1))
}

/** Nombre max de jours en arrière pour une déclaration rétroactive (hors aujourd’hui). */
export function getBackfillMaxDays(): number {
  return Math.max(1, Number(process.env.DRIVER_SALES_BACKFILL_MAX_DAYS) || 7)
}

/** Plus ancienne date (AAAA-MM-JJ) encore autorisée pour une saisie rétroactive. */
export function getOldestAllowedBackfillDateKey(now: Date = new Date()): string {
  const n = getBackfillMaxDays()
  let k = getBusinessDateKeyFromInstant(now)
  for (let i = 0; i < n; i++) {
    k = subtractOneCalendarDayFromKey(k)
  }
  return k
}

/** Fin de journée métier (23:59:59.999) pour une clé AAAA-MM-JJ — utilisée comme `declaredAt` pour les ventes rétroactives. */
export function getEndOfBusinessDayForDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - OFFSET_MS)
}

export type ValidateSaleBackfillResult =
  | { ok: true; declaredAt: Date }
  | { ok: false; error: string }

/** Valide une date rétroactive (strictement avant aujourd’hui, dans la fenêtre autorisée). */
export function validateSaleBackfillDate(
  saleDateKey: string,
  now: Date = new Date()
): ValidateSaleBackfillResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDateKey)) {
    return { ok: false, error: "Date invalide (format AAAA-MM-JJ attendu)." }
  }
  const todayKey = getBusinessDateKeyFromInstant(now)
  if (saleDateKey >= todayKey) {
    return {
      ok: false,
      error:
        "Pour les ventes d’aujourd’hui, utilisez « Aujourd’hui » sans date passée dans la requête.",
    }
  }
  const oldest = getOldestAllowedBackfillDateKey(now)
  if (saleDateKey < oldest) {
    const maxDays = getBackfillMaxDays()
    return {
      ok: false,
      error: `Vous ne pouvez pas déclarer des ventes datant de plus de ${maxDays} jour(s).`,
    }
  }
  return { ok: true, declaredAt: getEndOfBusinessDayForDateKey(saleDateKey) }
}
