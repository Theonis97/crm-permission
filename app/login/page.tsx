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
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex">
      {/* Section gauche - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
        {/* Motifs décoratifs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="max-w-md space-y-6 text-center">
            {/* Logo */}
            <div className="mb-8">
              <Image 
                src="/logo.jpeg" 
                alt="Logo" 
                width={180} 
                height={180}
                className="mx-auto rounded-2xl shadow-2xl"
                priority
              />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">
              Bienvenue sur INTECH ERP
            </h1>
            <p className="text-xl text-blue-100">
              Gérez votre entreprise de manière intelligente et efficace
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-3xl font-bold">500+</p>
                <p className="text-sm text-blue-200">Clients Satisfaits</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-3xl font-bold">99%</p>
                <p className="text-sm text-blue-200">Disponibilité</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section droite - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image 
              src="/logo.jpeg" 
              alt="Logo" 
              width={100} 
              height={100}
              className="rounded-xl shadow-lg"
              priority
            />
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-3 pb-6">
              <CardTitle className="text-3xl font-bold text-gray-900 text-center">
                Connexion
              </CardTitle>
              <CardDescription className="text-center text-base">
                Accédez à votre espace de gestion
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Adresse email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="nom@exemple.com"
                      autoComplete="email"
                      className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Mot de passe
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => {}}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-medium text-base shadow-lg hover:shadow-xl transition-all" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>

              {/* Test Accounts */}
              <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                  Comptes de test disponibles
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between py-1.5 px-2 bg-white/50 rounded-lg">
                    <span className="font-medium text-blue-900">Admin</span>
                    <span className="text-xs text-gray-600">admin@example.com</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 bg-white/50 rounded-lg">
                    <span className="font-medium text-green-900">Manager</span>
                    <span className="text-xs text-gray-600">manager@example.com</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 bg-white/50 rounded-lg">
                    <span className="font-medium text-purple-900">Commercial</span>
                    <span className="text-xs text-gray-600">commercial@example.com</span>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-3 italic">Mot de passe : password</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            © 2025 INTECH ERP. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}
