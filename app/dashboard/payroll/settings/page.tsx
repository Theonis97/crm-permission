"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Save, Shield, Info } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function PayrollSettingsPage() {
  const [configEmail, setConfigEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDefault, setIsDefault] = useState(true)
  const [updatedBy, setUpdatedBy] = useState<{ firstName?: string; lastName?: string; name?: string } | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/payroll/access/config")
      const data = await response.json()
      setConfigEmail(data.recipientEmail || "")
      setIsDefault(data.isDefault)
      setUpdatedBy(data.updatedBy)
      setUpdatedAt(data.updatedAt)
    } catch (err) {
      console.error("Error loading config:", err)
      toast.error("Erreur lors du chargement de la configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!configEmail || !configEmail.includes("@")) {
      toast.error("Veuillez entrer un email valide")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/payroll/access/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: configEmail }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors de la sauvegarde")
      }

      toast.success("Configuration sauvegardée avec succès")
      loadConfig() // Recharger pour mettre à jour les infos
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde")
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getUpdatedByName = () => {
    if (!updatedBy) return null
    if (updatedBy.firstName && updatedBy.lastName) {
      return `${updatedBy.firstName} ${updatedBy.lastName}`
    }
    return updatedBy.name || "Utilisateur inconnu"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres du module Paie</h1>
        <p className="text-gray-500 mt-1">
          Configurez les paramètres de sécurité et d'accès au module.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Double authentification</CardTitle>
              <CardDescription>
                Configuration de l'email de réception des codes d'accès
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Les codes d'accès au module Paie seront envoyés à cette adresse email. 
              Seul un administrateur peut modifier cette configuration.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              Email de réception des codes
            </Label>
            <Input
              id="email"
              type="email"
              value={configEmail}
              onChange={(e) => setConfigEmail(e.target.value)}
              placeholder="admin@example.com"
              className="max-w-md"
            />
            {isDefault && (
              <p className="text-sm text-amber-600">
                ⚠️ Vous utilisez l'email par défaut. Il est recommandé de le personnaliser.
              </p>
            )}
          </div>

          {updatedBy && updatedAt && (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              Dernière modification par <strong>{getUpdatedByName()}</strong> le{" "}
              {formatDate(updatedAt)}
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
