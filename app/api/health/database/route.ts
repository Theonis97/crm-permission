import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** Vérifie que Prisma peut se connecter (même diagnostic que le login). */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true as const })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const authFailed =
      msg.includes("Authentication failed") ||
      msg.includes("P1000") ||
      (msg.includes("credentials") && msg.includes("not valid"))
    const code = authFailed ? ("DB_AUTH" as const) : ("DB_UNAVAILABLE" as const)
    return NextResponse.json({ ok: false as const, code }, { status: 503 })
  }
}
