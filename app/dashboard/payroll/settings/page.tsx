"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Mail, Save, Shield, Info, Building2, FileText, Phone, Globe } from "lucide-react"
import { toast } from "@/lib/app-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface CompanySettings {
  id?: string
  companyName: string
  companyAddress: string
  companyCity: string
  companyPostalCode: string
  companyCountry: string
  rccmNumber: string
  nifNumber: string
  cnssEmployerNumber: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  companyLogo: string
  conventionCollective: string
  codeApe: string
}

const defaultCompanySettings: CompanySettings = {
  companyName: "",
  companyAddress: "",
  companyCity: "",
  companyPostalCode: "",
  companyCountry: "Gabon",
  rccmNumber: "",
  nifNumber: "",
  cnssEmployerNumber: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  companyLogo: "",
  conventionCollective: "",
  codeApe: "",
}

export default function PayrollSettingsPage() {
  const [configEmail, setConfigEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDefault, setIsDefault] = useState(true)
  const [updatedBy, setUpdatedBy] = useState<{ firstName?: string; lastName?: string; name?: string } | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  // Company settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings)
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [companyUpdatedBy, setCompanyUpdatedBy] = useState<{ firstName?: string; lastName?: string; name?: string } | null>(null)
  const [companyUpdatedAt, setCompanyUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
    loadCompanySettings()
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

  const loadCompanySettings = async () => {
    try {
      const response = await fetch("/api/payroll/company-settings")
      const data = await response.json()
      if (data) {
        setCompanySettings({
          id: data.id,
          companyName: data.companyName || "",
          companyAddress: data.companyAddress || "",
          companyCity: data.companyCity || "",
          companyPostalCode: data.companyPostalCode || "",
          companyCountry: data.companyCountry || "Gabon",
          rccmNumber: data.rccmNumber || "",
          nifNumber: data.nifNumber || "",
          cnssEmployerNumber: data.cnssEmployerNumber || "",
          companyPhone: data.companyPhone || "",
          companyEmail: data.companyEmail || "",
          companyWebsite: data.companyWebsite || "",
          companyLogo: data.companyLogo || "",
          conventionCollective: data.conventionCollective || "",
          codeApe: data.codeApe || "",
        })
        setCompanyUpdatedBy(data.updatedBy)
        setCompanyUpdatedAt(data.updatedAt)
      }
    } catch (err) {
      console.error("Error loading company settings:", err)
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
      loadConfig()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!companySettings.companyName || !companySettings.companyAddress || !companySettings.companyCity) {
      toast.error("Raison sociale, adresse et ville sont obligatoires")
      return
    }

    setIsSavingCompany(true)
    try {
      const response = await fetch("/api/payroll/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors de la sauvegarde")
      }

      toast.success("Informations entreprise sauvegardées avec succès")
      loadCompanySettings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde")
    } finally {
      setIsSavingCompany(false)
    }
  }

  const updateCompanyField = (field: keyof CompanySettings, value: string) => {
    setCompanySettings(prev => ({ ...prev, [field]: value }))
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres du module Paie</h1>
        <p className="text-gray-500 mt-1">
          Configurez les informations de l'entreprise et les paramètres de sécurité.
        </p>
      </div>

      {/* Informations de l'entreprise */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Informations de l'entreprise</CardTitle>
              <CardDescription>
                Ces informations apparaîtront sur les bulletins de paie
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations légales */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informations légales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Raison sociale *</Label>
                <Input
                  id="companyName"
                  value={companySettings.companyName}
                  onChange={(e) => updateCompanyField("companyName", e.target.value)}
                  placeholder="SAMBATECH SARL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rccmNumber">Numéro RCCM</Label>
                <Input
                  id="rccmNumber"
                  value={companySettings.rccmNumber}
                  onChange={(e) => updateCompanyField("rccmNumber", e.target.value)}
                  placeholder="GA-LBV-01-2024-B12-00123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nifNumber">Numéro d'Identification Fiscale (NIF)</Label>
                <Input
                  id="nifNumber"
                  value={companySettings.nifNumber}
                  onChange={(e) => updateCompanyField("nifNumber", e.target.value)}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnssEmployerNumber">Numéro CNSS Employeur</Label>
                <Input
                  id="cnssEmployerNumber"
                  value={companySettings.cnssEmployerNumber}
                  onChange={(e) => updateCompanyField("cnssEmployerNumber", e.target.value)}
                  placeholder="CNSS-EMP-12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conventionCollective">Convention collective</Label>
                <Input
                  id="conventionCollective"
                  value={companySettings.conventionCollective}
                  onChange={(e) => updateCompanyField("conventionCollective", e.target.value)}
                  placeholder="Convention collective du commerce"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codeApe">Code APE/NAF</Label>
                <Input
                  id="codeApe"
                  value={companySettings.codeApe}
                  onChange={(e) => updateCompanyField("codeApe", e.target.value)}
                  placeholder="6201Z"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Adresse */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Adresse du siège social
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="companyAddress">Adresse complète *</Label>
                <Textarea
                  id="companyAddress"
                  value={companySettings.companyAddress}
                  onChange={(e) => updateCompanyField("companyAddress", e.target.value)}
                  placeholder="123 Boulevard de l'Indépendance, Quartier Glass"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCity">Ville *</Label>
                <Input
                  id="companyCity"
                  value={companySettings.companyCity}
                  onChange={(e) => updateCompanyField("companyCity", e.target.value)}
                  placeholder="Libreville"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPostalCode">Boîte postale / Code postal</Label>
                <Input
                  id="companyPostalCode"
                  value={companySettings.companyPostalCode}
                  onChange={(e) => updateCompanyField("companyPostalCode", e.target.value)}
                  placeholder="BP 1234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCountry">Pays</Label>
                <Input
                  id="companyCountry"
                  value={companySettings.companyCountry}
                  onChange={(e) => updateCompanyField("companyCountry", e.target.value)}
                  placeholder="Gabon"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Coordonnées */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Coordonnées
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Téléphone</Label>
                <Input
                  id="companyPhone"
                  value={companySettings.companyPhone}
                  onChange={(e) => updateCompanyField("companyPhone", e.target.value)}
                  placeholder="+241 01 23 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={companySettings.companyEmail}
                  onChange={(e) => updateCompanyField("companyEmail", e.target.value)}
                  placeholder="contact@entreprise.ga"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Site web</Label>
                <Input
                  id="companyWebsite"
                  value={companySettings.companyWebsite}
                  onChange={(e) => updateCompanyField("companyWebsite", e.target.value)}
                  placeholder="https://www.entreprise.ga"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyLogo">URL du logo</Label>
                <Input
                  id="companyLogo"
                  value={companySettings.companyLogo}
                  onChange={(e) => updateCompanyField("companyLogo", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {companyUpdatedBy && companyUpdatedAt && (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              Dernière modification par <strong>{companyUpdatedBy.firstName && companyUpdatedBy.lastName ? `${companyUpdatedBy.firstName} ${companyUpdatedBy.lastName}` : companyUpdatedBy.name}</strong> le{" "}
              {formatDate(companyUpdatedAt)}
            </div>
          )}

          <Button onClick={handleSaveCompany} disabled={isSavingCompany} className="bg-blue-600 hover:bg-blue-700">
            {isSavingCompany ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer les informations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Double authentification */}
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
