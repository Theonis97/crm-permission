import NextAuth from "next-auth"
import type { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

type NextAuthParams = { nextauth: string[] }

/** Compat Next 16 : params asynchrones ; évite les 500 sur l’endpoint interne _log (proxy logger client). */
export async function GET(
  req: NextRequest,
  context: { params: Promise<NextAuthParams> },
) {
  return handler(req, context)
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<NextAuthParams> },
) {
  const { nextauth } = await context.params
  if (nextauth?.[0] === "_log") {
    return new Response(null, { status: 200 })
  }
  return handler(req, context)
}
