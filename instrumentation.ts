/**
 * Exécuté une fois au démarrage du serveur Node (Next.js).
 * Garantit que les variables du fichier .env sont chargées avant les routes API.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { loadEnvConfig } = await import("@next/env")
  const { resolve } = await import("path")
  loadEnvConfig(resolve(process.cwd()))
}
