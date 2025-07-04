import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith("/login")
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard")

    // Si l'utilisateur est sur la page de login et qu'il est authentifié
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Si l'utilisateur essaie d'accéder au dashboard sans être authentifié
    if (isDashboard && !isAuth) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }

      return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permettre l'accès aux pages publiques
        if (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/login") {
          return true
        }

        // Pour les routes du dashboard, vérifier le token
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token
        }

        // Permettre l'accès aux autres routes
        return true
      },
    },
  },
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
