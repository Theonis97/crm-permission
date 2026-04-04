/** Erreurs Prisma liées à la connexion / auth DB (pas à une requête métier). */
export function isPrismaDatabaseConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === "PrismaClientInitializationError") return true
  const m = error.message
  return (
    m.includes("P1000") ||
    m.includes("P1001") ||
    m.includes("P1017") ||
    m.includes("Authentication failed against database") ||
    m.includes("Can't reach database server")
  )
}
