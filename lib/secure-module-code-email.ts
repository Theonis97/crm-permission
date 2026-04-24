/**
 * Destinataire des codes d'accès 2FA (Paie / Comptabilité).
 * Priorité : valeur en base (ModuleAccessConfig) → variables d'env → défaut.
 */
export const DEFAULT_PAYROLL_CODE_RECIPIENT_EMAIL = "gabinmoundziegou@gmail.com"
export const DEFAULT_ACCOUNTING_CODE_RECIPIENT_EMAIL = "gabinmoundziegou@gmail.com"

export function payrollCodeRecipientEmail(dbRecipientEmail: string | null | undefined): string {
  const fromDb = dbRecipientEmail?.trim()
  if (fromDb) return fromDb
  return (
    process.env.PAYROLL_CODE_RECIPIENT_EMAIL?.trim() || DEFAULT_PAYROLL_CODE_RECIPIENT_EMAIL
  )
}

export function accountingCodeRecipientEmail(dbRecipientEmail: string | null | undefined): string {
  const fromDb = dbRecipientEmail?.trim()
  if (fromDb) return fromDb
  return (
    process.env.ACCOUNTING_CODE_RECIPIENT_EMAIL?.trim() ||
    DEFAULT_ACCOUNTING_CODE_RECIPIENT_EMAIL
  )
}
