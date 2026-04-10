import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveDeliveryPersonByUserEmail } from "@/lib/driver-session"
import { userCanAccessDriverRestock } from "@/lib/driver-restock-access"

/** Boutiques actives — livreur (email), rôle livreur, ou admin / gestionnaire. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { allowed, reason } = await userCanAccessDriverRestock(session.user.id, session.user.email)
    if (!allowed) {
      return NextResponse.json(
        { error: "Accès réservé aux livreurs ou aux gestionnaires." },
        { status: 403 },
      )
    }

    const isStaff = reason === "staff"

    // Chercher la fiche livreur (par email) si l'utilisateur n'est pas staff
    const driver = !isStaff
      ? await getActiveDeliveryPersonByUserEmail(session.user.email)
      : null

    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true },
      orderBy: { name: "asc" },
    })

    // Mode gestionnaire : liste des livreurs disponibles
    let drivers: { id: string; name: string; phone: string; storeName: string }[] | undefined
    if (isStaff) {
      const rows = await prisma.deliveryPerson.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          phone: true,
          store: { select: { name: true } },
        },
        orderBy: { name: "asc" },
        take: 300,
      })
      drivers = rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        storeName: r.store.name,
      }))
    }

    // Livreur avec rôle mais sans fiche DeliveryPerson
    const noDriverProfile = !isStaff && !driver

    return NextResponse.json({
      success: true,
      data: noDriverProfile ? [] : stores,
      mode: isStaff ? "staff" : "driver",
      driver: driver ? { id: driver.id, name: driver.name, homeStoreId: driver.storeId } : null,
      drivers,
      ...(noDriverProfile && {
        warning: "no_driver_profile",
        message:
          "Votre compte n'a pas encore de fiche livreur associée à l'email " +
          session.user.email +
          ". Demandez à un administrateur de créer votre fiche livreur.",
      }),
    })
  } catch (e) {
    console.error("[driver/restock/stores]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
