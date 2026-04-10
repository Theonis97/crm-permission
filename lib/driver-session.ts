import { prisma } from "@/lib/prisma"

/** Profil livreur lié au compte utilisateur (même email, actif). */
export async function getActiveDeliveryPersonByUserEmail(email: string | null | undefined) {
  if (!email?.trim()) return null
  const e = email.trim()
  return prisma.deliveryPerson.findFirst({
    where: {
      isActive: true,
      email: { equals: e, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      storeId: true,
    },
  })
}
