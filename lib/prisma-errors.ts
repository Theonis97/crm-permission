import { NextResponse } from "next/server"

/** Vérifie si l'erreur Prisma est liée à la connexion DB */
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

/**
 * Retourne une réponse HTTP si la base est inaccessible
 */
export function nextResponseIfDatabaseUnreachable(error: unknown): NextResponse | null {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : ""
  const msg = error instanceof Error ? error.message : String(error)

  if (code === "P1001" || msg.includes("P1001") || msg.includes("Can't reach database server")) {
    return NextResponse.json(
      {
        error:
          "Base de données inaccessible. Vérifiez PostgreSQL, le réseau et vos variables d’environnement.",
      },
      { status: 503 }
    )
  }

  return null
}