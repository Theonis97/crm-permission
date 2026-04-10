import { NextResponse } from "next/server"

/**
 * P1001 = serveur PostgreSQL injoignable (mauvaise URL, pare-feu, serveur arrêté, etc.)
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
          "Base de données inaccessible. Vérifiez que PostgreSQL est démarré, que le réseau autorise la connexion, et que DIRECT_URL / DATABASE_URL dans .env pointent vers le bon hôte et port.",
      },
      { status: 503 }
    )
  }
  return null
}
