import { NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Liste simple de tous les magasins (id + nom) pour les selects
export async function GET() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const stores = await prisma.store.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(stores)
  } catch (err) {
    console.error("Error fetching stores simple list:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
