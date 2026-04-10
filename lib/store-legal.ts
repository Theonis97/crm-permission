/** Erreur Prisma / PG quand les colonnes juridiques du modèle Store ne sont pas encore en base. */
export function isPrismaMissingStoreLegalColumns(error: unknown): boolean {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined
  if (code === "P2022") return true
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes("does not exist") ||
    msg.includes("Unknown column") ||
    msg.includes("forme_juridique") ||
    msg.includes("cnss_employeur") ||
    msg.includes("42703")
  )
}

/** Parse une date « yyyy-MM-dd » ou ISO pour Prisma ; chaîne vide → null. */
export function parseStoreDateInput(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatStoreDateForInput(iso: string | Date | null | undefined): string {
  if (!iso) return ""
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}
