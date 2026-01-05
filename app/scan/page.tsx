"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  LogIn,
  LogOut,
  User,
  Smartphone
} from "lucide-react"

function ScanContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "auth" | "validating" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [attendanceType, setAttendanceType] = useState<"CHECK_IN" | "CHECK_OUT" | null>(null)
  const [timestamp, setTimestamp] = useState<Date | null>(null)
  
  // Auth state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMessage("Token manquant. Veuillez scanner un QR code valide.")
      return
    }
    
    // Vérifier si l'utilisateur est déjà connecté (session)
    checkSession()
  }, [token])

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session")
      const session = await response.json()
      
      if (session?.user?.id) {
        setUserId(session.user.id)
        setUserName(session.user.name || session.user.email)
        // Valider automatiquement le pointage
        validateAttendance(session.user.id)
      } else {
        setStatus("auth")
      }
    } catch (error) {
      setStatus("auth")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setErrorMessage(null)

    try {
      // Authentifier l'utilisateur via l'API de scan
      const response = await fetch("/api/attendance/scan/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Identifiants incorrects")
      }

      setUserId(data.id)
      setUserName(data.name || data.email)
      validateAttendance(data.id)
    } catch (error: any) {
      setErrorMessage(error.message || "Erreur de connexion")
    } finally {
      setIsAuthenticating(false)
    }
  }

  const validateAttendance = async (userIdToUse: string) => {
    if (!token) return
    
    setStatus("validating")
    
    try {
      // Générer un deviceId basé sur le navigateur
      const deviceId = `WEB_${navigator.userAgent.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`
      
      const response = await fetch("/api/attendance/qr/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: token,
          deviceId,
          userId: userIdToUse,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setAttendanceType(data.type)
        setTimestamp(new Date(data.timestamp))
      } else {
        setStatus("error")
        setErrorMessage(data.error || "Erreur lors du pointage")
      }
    } catch (error) {
      setStatus("error")
      setErrorMessage("Erreur de connexion au serveur")
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-cyan-600" />
          </div>
          <CardTitle className="text-2xl">Pointage</CardTitle>
          <CardDescription>
            Système de pointage Sambatech
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Loading */}
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mx-auto mb-4" />
              <p className="text-gray-600">Vérification...</p>
            </div>
          )}

          {/* Authentification requise */}
          {status === "auth" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-6">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Identifiez-vous pour pointer</p>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Mot de passe</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Valider mon pointage"
                )}
              </Button>
            </form>
          )}

          {/* Validation en cours */}
          {status === "validating" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mx-auto mb-4" />
              <p className="text-gray-600">Enregistrement du pointage...</p>
              {userName && (
                <p className="text-sm text-gray-500 mt-2">Bonjour, {userName}</p>
              )}
            </div>
          )}

          {/* Succès */}
          {status === "success" && timestamp && (
            <div className="text-center py-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                attendanceType === "CHECK_IN" ? "bg-green-100" : "bg-orange-100"
              }`}>
                {attendanceType === "CHECK_IN" ? (
                  <LogIn className="h-10 w-10 text-green-600" />
                ) : (
                  <LogOut className="h-10 w-10 text-orange-600" />
                )}
              </div>
              
              <h3 className={`text-2xl font-bold mb-2 ${
                attendanceType === "CHECK_IN" ? "text-green-700" : "text-orange-700"
              }`}>
                {attendanceType === "CHECK_IN" ? "Arrivée enregistrée" : "Départ enregistré"}
              </h3>

              {userName && (
                <p className="text-gray-600 mb-4">Bonjour, {userName} !</p>
              )}

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {formatTime(timestamp)}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {formatDate(timestamp)}
                </p>
              </div>

              <Badge className={`text-sm px-4 py-2 ${
                attendanceType === "CHECK_IN" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-orange-100 text-orange-800"
              }`}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Pointage validé
              </Badge>

              <p className="text-sm text-gray-500 mt-6">
                Vous pouvez fermer cette page.
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
              <p className="text-gray-600 mb-4">
                {errorMessage || "Une erreur est survenue."}
              </p>
              
              {errorMessage?.includes("expiré") && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-800">
                    Le QR code a expiré. Veuillez scanner un nouveau QR code sur la borne.
                  </p>
                </div>
              )}

              {errorMessage?.includes("Appareil non autorisé") && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <Smartphone className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-800">
                    Votre appareil n'est pas encore autorisé. Contactez les RH pour enregistrer votre appareil.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-cyan-600" />
            </div>
            <CardTitle className="text-2xl">Pointage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mx-auto mb-4" />
              <p className="text-gray-600">Chargement...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
