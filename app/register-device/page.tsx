"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react"

interface UserInfo {
  id: string
  firstName: string | null
  lastName: string | null
  name: string | null
  email: string
  matricule: string | null
}

interface TokenValidation {
  valid: boolean
  user: UserInfo
  expiresAt: string
}

export default function RegisterDevicePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired" | "registered" | "error">("loading")
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      validateToken()
    } else {
      setStatus("invalid")
      setErrorMessage("Token manquant dans l'URL")
    }
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/attendance/register-link?token=${token}`)
      
      if (response.ok) {
        const data: TokenValidation = await response.json()
        setUser(data.user)
        setStatus("valid")
      } else if (response.status === 410) {
        setStatus("expired")
        setErrorMessage("Ce lien a expiré")
      } else {
        setStatus("invalid")
        const error = await response.json()
        setErrorMessage(error.error || "Lien invalide")
      }
    } catch (error) {
      setStatus("error")
      setErrorMessage("Erreur de connexion au serveur")
    }
  }

  const registerDevice = async () => {
    if (!token) return

    setIsRegistering(true)
    try {
      // Générer un ID unique pour cet appareil
      const deviceId = `WEB_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      // Détecter la plateforme
      const platform = navigator.userAgent.includes("Mobile") ? "mobile-web" : "desktop-web"
      const deviceName = navigator.userAgent.substring(0, 100)

      const response = await fetch("/api/attendance/register-link", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          deviceId,
          deviceName,
          platform,
        }),
      })

      if (response.ok) {
        setStatus("registered")
      } else {
        const error = await response.json()
        setErrorMessage(error.error || "Erreur lors de l'enregistrement")
        setStatus("error")
      }
    } catch (error) {
      setErrorMessage("Erreur de connexion au serveur")
      setStatus("error")
    } finally {
      setIsRegistering(false)
    }
  }

  const getUserDisplayName = (user: UserInfo) => {
    if (user.name) return user.name
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim()
    }
    return user.email
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-cyan-600" />
          </div>
          <CardTitle className="text-2xl">Enregistrement d'appareil</CardTitle>
          <CardDescription>
            Système de pointage Sambatech
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Loading */}
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mx-auto mb-4" />
              <p className="text-gray-600">Vérification du lien...</p>
            </div>
          )}

          {/* Token valide - Afficher les infos utilisateur */}
          {status === "valid" && user && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Employé</p>
                <p className="font-semibold text-lg">{getUserDisplayName(user)}</p>
                {user.matricule && (
                  <Badge variant="outline" className="mt-1">
                    {user.matricule}
                  </Badge>
                )}
                <p className="text-sm text-gray-500 mt-2">{user.email}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Important</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      En cliquant sur "Enregistrer", cet appareil sera associé à votre compte 
                      pour le pointage. L'enregistrement nécessite une validation RH.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={registerDevice} 
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Enregistrer cet appareil
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Enregistrement réussi */}
          {status === "registered" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                Appareil enregistré !
              </h3>
              <p className="text-gray-600">
                Votre appareil a été enregistré avec succès. 
                Il sera activé après validation par les RH.
              </p>
              <Badge className="mt-4 bg-yellow-100 text-yellow-800">
                En attente de validation
              </Badge>
            </div>
          )}

          {/* Token invalide */}
          {status === "invalid" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-red-800 mb-2">
                Lien invalide
              </h3>
              <p className="text-gray-600">
                {errorMessage || "Ce lien d'enregistrement n'est pas valide."}
              </p>
            </div>
          )}

          {/* Token expiré */}
          {status === "expired" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-orange-800 mb-2">
                Lien expiré
              </h3>
              <p className="text-gray-600">
                Ce lien a expiré. Veuillez demander un nouveau lien à votre responsable RH.
              </p>
            </div>
          )}

          {/* Erreur */}
          {status === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-red-800 mb-2">
                Erreur
              </h3>
              <p className="text-gray-600">
                {errorMessage || "Une erreur est survenue."}
              </p>
              <Button 
                variant="outline" 
                onClick={validateToken}
                className="mt-4"
              >
                Réessayer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
