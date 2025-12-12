import { NextRequest, NextResponse } from "next/server"

/**
 * Vérifie si la requête contient une clé API valide dans le header x-api-key
 * Utilisé pour les routes externes (/api/ext/*)
 */
export function validateApiKey(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const apiKey = request.headers.get("x-api-key")
  
  if (!apiKey) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: "API key is required", code: "MISSING_API_KEY" },
        { status: 401 }
      ),
    }
  }

  const expectedApiKey = process.env.BACKEND_API_KEY

  if (!expectedApiKey) {
    console.error("❌ [EXT_API] BACKEND_API_KEY is not configured in environment variables")
    return {
      valid: false,
      error: NextResponse.json(
        { error: "Server configuration error", code: "SERVER_ERROR" },
        { status: 500 }
      ),
    }
  }

  if (apiKey !== expectedApiKey) {
    console.warn("⚠️ [EXT_API] Invalid API key attempt")
    return {
      valid: false,
      error: NextResponse.json(
        { error: "Invalid API key", code: "INVALID_API_KEY" },
        { status: 401 }
      ),
    }
  }

  return { valid: true }
}

/**
 * Middleware helper pour les routes externes
 * Retourne null si la clé est valide, sinon retourne la réponse d'erreur
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const { valid, error } = validateApiKey(request)
  return valid ? null : error!
}
