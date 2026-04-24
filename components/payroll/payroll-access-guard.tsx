"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Lock, Mail, RefreshCw, ShieldCheck, AlertCircle } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface PayrollAccessContextType {
  isVerified: boolean
  resetAccess: () => void
}

const PayrollAccessContext = createContext<PayrollAccessContextType>({
  isVerified: false,
  resetAccess: () => {},
})

export const usePayrollAccess = () => useContext(PayrollAccessContext)

interface PayrollAccessGuardProps {
  children: React.ReactNode
}

export function PayrollAccessGuard({ children }: PayrollAccessGuardProps) {
  const { data: session, status } = useSession()
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(0)

  const resetAccess = useCallback(() => {
    setIsVerified(false)
    setCodeSent(false)
    setCode("")
    setError(null)
    setExpiresAt(null)
  }, [])

  // Countdown
  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      setCountdown(remaining)
      
      if (remaining === 0) {
        setCodeSent(false)
        setError("Le code a expiré. Veuillez en demander un nouveau.")
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const requestCode = async () => {
    setIsSendingCode(true)
    setError(null)
    
    try {
      const response = await fetch("/api/payroll/access/request-code", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi du code")
      }

      setCodeSent(true)
      setExpiresAt(new Date(data.expiresAt))
      toast.success("Code envoyé par email")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
      toast.error("Erreur lors de l'envoi du code")
    } finally {
      setIsSendingCode(false)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/payroll/access/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Code invalide")
      }

      setIsVerified(true)
      toast.success("Accès autorisé")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Non authentifié</h2>
        <p className="text-gray-500">Veuillez vous connecter pour accéder à cette section.</p>
      </div>
    )
  }

  if (isVerified) {
    return (
      <PayrollAccessContext.Provider value={{ isVerified, resetAccess }}>
        {children}
      </PayrollAccessContext.Provider>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès Sécurisé</h1>
            <p className="text-gray-500">
              L'accès au module Paie nécessite une double authentification.
            </p>
          </div>

          {!codeSent ? (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">
                      Vérification par email
                    </p>
                    <p className="text-sm text-indigo-700 mt-1">
                      Un code à 6 chiffres sera envoyé à l'administrateur pour valider votre accès.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={requestCode}
                disabled={isSendingCode}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Demander un code d'accès
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Code envoyé !
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Demandez le code à l'administrateur et saisissez-le ci-dessous.
                    </p>
                    {countdown > 0 && (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        Expire dans: {formatCountdown(countdown)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    setCode(value)
                    setError(null)
                  }}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}
              </div>

              <Button
                onClick={verifyCode}
                disabled={isLoading || code.length !== 6}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Valider l'accès
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={requestCode}
                disabled={isSendingCode}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSendingCode ? "animate-spin" : ""}`} />
                Renvoyer un code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
