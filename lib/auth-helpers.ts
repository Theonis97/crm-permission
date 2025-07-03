import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Helper pour obtenir une session authentifiée côté serveur
 * Retourne la session ou une réponse d'erreur 401
 */
export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return {
    session,
    error: null,
  }
}

/**
 * Type guard pour vérifier qu'une session est valide
 */
export function isValidSession(session: any): session is { user: { id: string; email: string; name?: string } } {
  return session && session.user && typeof session.user.id === "string"
}
