"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  LogIn,
  LogOut,
  Smartphone
} from "lucide-react"

function ScanContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "validating" | "success" | "error" | "not_registered">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [attendanceType, setAttendanceType] = useState<"CHECK_IN" | "CHECK_OUT" | null>(null)
  const [timestamp, setTimestamp] = useState<Date | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMessage("Token manquant. Veuillez scanner un QR code valide.")
      return
    }
    
    // Vérifier si l'appareil est enregistré (localStorage)
    checkRegisteredDevice()
  }, [token])

  const checkRegisteredDevice = async () => {
    // Vérifier si cet appareil est enregistré
    const storedDeviceId = localStorage.getItem("attendance_device_id")
    const storedUserId = localStorage.getItem("attendance_user_id")
    const storedUserName = localStorage.getItem("attendance_user_name")

    if (storedDeviceId && storedUserId) {
      // Appareil enregistré, pointer automatiquement
      setUserName(storedUserName)
      validateAttendance(storedUserId, storedDeviceId)
    } else {
      // Appareil non enregistré
      setStatus("not_registered")
    }
  }

  const validateAttendance = async (userIdToUse: string, deviceIdToUse?: string) => {
    if (!token) return
    
    setStatus("validating")
    
    try {
      // Utiliser le deviceId fourni ou générer un temporaire
      const deviceId = deviceIdToUse || localStorage.getItem("attendance_device_id") || `WEB_${navigator.userAgent.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`
      
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

          {/* Appareil non enregistré */}
          {status === "not_registered" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-orange-800 mb-2">
                Appareil non enregistré
              </h3>
              <p className="text-gray-600 mb-4">
                Cet appareil n'est pas enregistré pour le pointage.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  Demandez à votre responsable RH de vous envoyer un lien d'enregistrement pour associer cet appareil à votre compte.
                </p>
              </div>
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
