"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  // Rediriger si déjà connecté
  useEffect(() => {
    if (status === "authenticated" && session) {
      const redirectTo = searchParams.get("from") || searchParams.get("callbackUrl") || "/dashboard"
      console.log("Already authenticated, redirecting to:", redirectTo)
      router.push(redirectTo)
    }
  }, [status, session, router, searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("Attempting login with:", email)

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      console.log("Login result:", result)

      if (result?.error) {
        console.error("Login error:", result.error)
        setError("Email ou mot de passe incorrect")
      } else if (result?.ok) {
        console.log("Login successful!")

        // Attendre que la session soit mise à jour
        setTimeout(() => {
          const redirectTo = searchParams.get("from") || searchParams.get("callbackUrl") || "/dashboard"
          console.log("Redirecting to:", redirectTo)
          router.push(redirectTo)
          // Forcer un refresh pour s'assurer que la session est prise en compte
          window.location.href = redirectTo
        }, 1000)
      }
    } catch (error) {
      console.error("Login exception:", error)
      setError("Une erreur est survenue lors de la connexion")
    } finally {
      setLoading(false)
    }
  }

  // Si déjà en cours d'authentification, afficher un loader
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Vérification de la session...</p>
        </div>
      </div>
    )
  }

  // Si déjà connecté, ne pas afficher le formulaire
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion INTECH ERP</CardTitle>
          <CardDescription>Connectez-vous à votre compte pour accéder à l'ERP</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="password"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Comptes de test :</p>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                <strong>Admin :</strong> admin@example.com / password
              </p>
              <p>
                <strong>Manager :</strong> manager@example.com / password
              </p>
              <p>
                <strong>Commercial :</strong> commercial@example.com / password
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
