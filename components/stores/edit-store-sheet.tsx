"use client"

import { useState, useEffect, type ElementType, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Store,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Building2,
  ShieldCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ManagerSelector } from "@/components/stores/manager-selector"

// ─── Types ─────────────────────────────────────────────────────────────────

interface StoreData {
  id: string
  name: string
  logo?: string | null
  coverImage?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  whatsapp?: string | null
  isActive: boolean
  managerId?: string | null
  // Juridique
  formeJuridique?: string | null
  rccm?: string | null
  nif?: string | null
  cnssEmployeur?: string | null
  cnssPatronale?: string | null
  siegeSocial?: string | null
  dateCreation?: string | null
}

interface EditStoreSheetProps {
  storeId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ─── Étapes ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    label: "Général",
    description: "Nom, logo, statut",
    icon: Store,
    color: "blue",
  },
  {
    id: 2,
    label: "Coordonnées",
    description: "Adresse, téléphone",
    icon: MapPin,
    color: "purple",
  },
  {
    id: 3,
    label: "Juridique",
    description: "RCCM, NIF, CNSS",
    icon: ShieldCheck,
    color: "emerald",
  },
]

const FORMES_JURIDIQUES = [
  { value: "SARL", label: "SARL – Société à Responsabilité Limitée" },
  { value: "SA", label: "SA – Société Anonyme" },
  { value: "SNC", label: "SNC – Société en Nom Collectif" },
  { value: "SCS", label: "SCS – Société en Commandite Simple" },
  { value: "EI", label: "EI – Entreprise Individuelle" },
  { value: "EURL", label: "EURL – Entreprise Unipersonnelle à RL" },
  { value: "GIE", label: "GIE – Groupement d'Intérêt Économique" },
  { value: "AUTRE", label: "Autre" },
]

// ─── Composant principal ────────────────────────────────────────────────────

export function EditStoreSheet({ storeId, open, onClose, onSuccess }: EditStoreSheetProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const [formData, setFormData] = useState<Omit<StoreData, "id">>({
    name: "",
    logo: "",
    coverImage: "",
    address: "",
    phone: "",
    email: "",
    whatsapp: "",
    isActive: true,
    managerId: null,
    formeJuridique: "",
    rccm: "",
    nif: "",
    cnssEmployeur: "",
    cnssPatronale: "",
    siegeSocial: "",
    dateCreation: "",
  })

  // Charger les données du magasin à l'ouverture
  useEffect(() => {
    if (!open || !storeId) return

    const fetchStore = async () => {
      setFetching(true)
      try {
        const res = await fetch(`/api/stores/${storeId}`)
        if (!res.ok) throw new Error("Impossible de charger le magasin")
        const store: StoreData = await res.json()

        setFormData({
          name: store.name ?? "",
          logo: store.logo ?? "",
          coverImage: store.coverImage ?? "",
          address: store.address ?? "",
          phone: store.phone ?? "",
          email: store.email ?? "",
          whatsapp: store.whatsapp ?? "",
          isActive: store.isActive ?? true,
          managerId: store.managerId ?? null,
          formeJuridique: store.formeJuridique ?? "",
          rccm: store.rccm ?? "",
          nif: store.nif ?? "",
          cnssEmployeur: store.cnssEmployeur ?? "",
          cnssPatronale: store.cnssPatronale ?? "",
          siegeSocial: store.siegeSocial ?? "",
          dateCreation: store.dateCreation ?? "",
        })
      } catch (err) {
        toast({
          title: "Erreur",
          description: err instanceof Error ? err.message : "Erreur de chargement",
          variant: "destructive",
        })
        onClose()
      } finally {
        setFetching(false)
      }
    }

    setCurrentStep(1)
    fetchStore()
  }, [open, storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: keyof typeof formData, value: string | boolean | null) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  // Validation simple par étape
  const canProceed = (step: number): boolean => {
    if (step === 1) return formData.name.trim().length >= 2
    return true
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" })
      setCurrentStep(1)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Erreur lors de la mise à jour")
      }

      const updated: StoreData = await res.json()
      toast({
        title: "Magasin mis à jour",
        description: `${updated.name} a été modifié avec succès`,
      })
      onSuccess()
      onClose()
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
        {/* En-tête */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 rounded-xl flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-lg">Modifier le magasin</SheetTitle>
              <SheetDescription>{formData.name || "Chargement…"}</SheetDescription>
            </div>
          </div>

          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isDone = currentStep > step.id
              return (
                <div key={step.id} className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => isDone && setCurrentStep(step.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full",
                      isActive && "bg-blue-600 text-white shadow",
                      isDone && "bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200",
                      !isActive && !isDone && "bg-gray-100 text-gray-400 cursor-default"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" />
                    )}
                    <span className="hidden sm:inline truncate">{step.label}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-auto text-xs shrink-0",
                        isActive && "bg-blue-500 text-white",
                        isDone && "bg-blue-200 text-blue-800"
                      )}
                    >
                      {step.id}
                    </Badge>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </SheetHeader>

        {/* Contenu des étapes */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* ── Étape 1 : Informations générales ── */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <SectionTitle icon={Store} color="blue" title="Informations générales" />

                  {/* Nom */}
                  <Field label="Nom du magasin" required>
                    <Input
                      value={formData.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ex: Madame Solde Centre-Ville"
                      className="rounded-full"
                    />
                  </Field>

                  {/* Statut */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div>
                      <p className="text-sm font-semibold">Statut</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formData.isActive ? "Boutique active" : "Boutique inactive"}
                      </p>
                    </div>
                    <Switch
                      checked={!!formData.isActive}
                      onCheckedChange={(v) => set("isActive", v)}
                    />
                  </div>

                  {/* Manager */}
                  <ManagerSelector
                    value={formData.managerId ?? null}
                    onChange={(v) => set("managerId", v)}
                    disabled={loading}
                  />

                  {/* Logo URL */}
                  <Field label="URL du logo">
                    <Input
                      type="url"
                      value={formData.logo ?? ""}
                      onChange={(e) => set("logo", e.target.value)}
                      placeholder="https://exemple.com/logo.png"
                      className="rounded-full"
                    />
                  </Field>

                  {/* Image de couverture */}
                  <Field label="URL de l'image de couverture">
                    <Input
                      type="url"
                      value={formData.coverImage ?? ""}
                      onChange={(e) => set("coverImage", e.target.value)}
                      placeholder="https://exemple.com/cover.jpg"
                      className="rounded-full"
                    />
                  </Field>
                </div>
              )}

              {/* ── Étape 2 : Coordonnées ── */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <SectionTitle icon={MapPin} color="purple" title="Coordonnées" />

                  <Field label="Adresse">
                    <Textarea
                      value={formData.address ?? ""}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="123 Boulevard de l'Indépendance, Libreville"
                      rows={3}
                      className="resize-none rounded-xl"
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Téléphone" icon={Phone}>
                      <Input
                        type="tel"
                        value={formData.phone ?? ""}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="+241 6XX XXX XXX"
                        className="rounded-full"
                      />
                    </Field>

                    <Field label="WhatsApp" icon={MessageCircle}>
                      <Input
                        type="tel"
                        value={formData.whatsapp ?? ""}
                        onChange={(e) => set("whatsapp", e.target.value)}
                        placeholder="+241 6XX XXX XXX"
                        className="rounded-full"
                      />
                    </Field>
                  </div>

                  <Field label="Email" icon={Mail}>
                    <Input
                      type="email"
                      value={formData.email ?? ""}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="contact@madamesolde.ga"
                      className="rounded-full"
                    />
                  </Field>
                </div>
              )}

              {/* ── Étape 3 : Informations juridiques ── */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <SectionTitle icon={ShieldCheck} color="emerald" title="Informations juridiques" />

                  <p className="text-sm text-gray-500 -mt-2">
                    Ces informations apparaîtront sur les documents officiels (factures, reçus…).
                  </p>

                  {/* Forme juridique */}
                  <Field label="Forme juridique" icon={Building2}>
                    <Select
                      value={formData.formeJuridique ?? ""}
                      onValueChange={(v) => set("formeJuridique", v)}
                    >
                      <SelectTrigger className="rounded-full">
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMES_JURIDIQUES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* RCCM */}
                    <Field label="N° RCCM">
                      <Input
                        value={formData.rccm ?? ""}
                        onChange={(e) => set("rccm", e.target.value)}
                        placeholder="LBV/2024/B/XXXX"
                        className="rounded-full"
                      />
                      <p className="text-xs text-gray-400 mt-1">Registre du Commerce et du Crédit Mobilier</p>
                    </Field>

                    {/* NIF */}
                    <Field label="N° NIF">
                      <Input
                        value={formData.nif ?? ""}
                        onChange={(e) => set("nif", e.target.value)}
                        placeholder="XXXXXXXXXX"
                        className="rounded-full"
                      />
                      <p className="text-xs text-gray-400 mt-1">Numéro d'Identification Fiscale</p>
                    </Field>

                    {/* CNSS Employeur */}
                    <Field label="N° CNSS Employeur">
                      <Input
                        value={formData.cnssEmployeur ?? ""}
                        onChange={(e) => set("cnssEmployeur", e.target.value)}
                        placeholder="XXXXXXXXXX"
                        className="rounded-full"
                      />
                      <p className="text-xs text-gray-400 mt-1">Numéro d'employeur CNSS</p>
                    </Field>

                    {/* CNSS Patronale */}
                    <Field label="N° Cotisation Patronale CNSS">
                      <Input
                        value={formData.cnssPatronale ?? ""}
                        onChange={(e) => set("cnssPatronale", e.target.value)}
                        placeholder="XXXXXXXXXX"
                        className="rounded-full"
                      />
                      <p className="text-xs text-gray-400 mt-1">Cotisation patronale</p>
                    </Field>

                    {/* Date de création */}
                    <Field label="Date de création">
                      <Input
                        type="date"
                        value={formData.dateCreation ?? ""}
                        onChange={(e) => set("dateCreation", e.target.value)}
                        className="rounded-full"
                      />
                    </Field>
                  </div>

                  {/* Siège social */}
                  <Field label="Siège social" icon={MapPin}>
                    <Textarea
                      value={formData.siegeSocial ?? ""}
                      onChange={(e) => set("siegeSocial", e.target.value)}
                      placeholder="Adresse complète du siège social (si différente de l'adresse du magasin)"
                      rows={3}
                      className="resize-none rounded-xl"
                    />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pied — navigation */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => (currentStep > 1 ? setCurrentStep((s) => s - 1) : onClose())}
            disabled={loading || fetching}
            className="gap-2 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 1 ? "Annuler" : "Précédent"}
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed(currentStep) || fetching}
              className="gap-2 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || fetching}
              className="gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Petits composants utilitaires ─────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  color,
  title,
}: {
  icon: ElementType
  color: "blue" | "purple" | "emerald"
  title: string
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    emerald: "bg-emerald-100 text-emerald-700",
  }
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold", colors[color])}>
      <Icon className="h-4 w-4" />
      {title}
    </div>
  )
}

function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string
  required?: boolean
  icon?: ElementType
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  )
}
