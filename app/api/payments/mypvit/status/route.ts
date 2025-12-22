import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { myPvitService } from "@/lib/mypvit-service"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get("transactionId")

    if (!transactionId) {
      return NextResponse.json(
        { error: "ID de transaction requis" },
        { status: 400 }
      )
    }

    const result = await myPvitService.checkStatus(transactionId)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error: any) {
    console.error("[MyPVit Status]", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
