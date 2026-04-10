"use client"

import { Toaster } from "sonner"

/** Nécessaire pour que les appels `toast()` (sonner) soient visibles dans toute l’app. */
export function SonnerToaster() {
  return <Toaster position="top-right" richColors closeButton />
}
