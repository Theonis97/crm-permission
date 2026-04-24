/**
 * Toast applicatif : les succès sont silencieux (pas de bandeau vert),
 * seules les erreurs et infos utiles restent visibles.
 */
import { toast as sonnerToast } from "sonner"

export const toast = Object.assign(sonnerToast, {
  success: () => undefined as unknown as string | number,
})
