"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Store,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ImageIcon,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Schéma de validation
const storeSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
})

type StoreFormData = z.infer<typeof storeSchema>

export default function NewStorePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 2

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
  })

  const logo = watch("logo")
  const coverImage = watch("coverImage")

  const onSubmit = async (data: StoreFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la création")
      }

      const store = await response.json()
      
      toast.success("Boutique créée avec succès!", {
        description: `${store.name} a été créée.`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
      
      router.push("/dashboard/stores")
      router.refresh()
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de créer la boutique",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: "Informations", description: "Détails de la boutique" },
    { number: 2, title: "Images", description: "Logo et couverture" },
  ]

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFormSubmit = async (data: StoreFormData) => {
    if (currentStep < totalSteps) {
      nextStep()
      return
    }
    await onSubmit(data)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header avec Steps */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {/* Steps Navigation */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-full transition-all",
                    currentStep === step.number
                      ? "bg-black text-white shadow-lg scale-105"
                      : currentStep > step.number
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                      currentStep === step.number
                        ? "bg-white/20"
                        : currentStep > step.number
                        ? "bg-green-200"
                        : "bg-gray-200"
                    )}
                  >
                    {currentStep > step.number ? "✓" : step.number}
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-semibold text-sm">{step.title}</p>
                    <p className="text-xs opacity-80">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 mx-2 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Step 1: Informations */}
          {currentStep === 1 && (
            <Card className="border-2 pt-0 hover:border-gray-300 transition-colors animate-in fade-in duration-500">
              <CardHeader className="bg-black py-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Store className="h-5 w-5" />
                  Informations de la Boutique
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Renseignez les informations de base et de contact
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Nom */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
                    Nom de la boutique <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: Magasin Centre-Ville"
                    {...register("name")}
                    className={cn("rounded-full", errors.name ? "border-red-500" : "")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                {/* Adresse */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adresse
                  </Label>
                  <Input
                    id="address"
                    placeholder="123 Rue Principale, Douala"
                    {...register("address")}
                    className="rounded-full"
                  />
                </div>

                {/* Contact info grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+241 6XX XXX XXX"
                      {...register("phone")}
                      className="rounded-full"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm font-semibold flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="+241 6XX XXX XXX"
                      {...register("whatsapp")}
                      className="rounded-full"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@boutique.cm"
                    {...register("email")}
                    className={cn("rounded-full", errors.email ? "border-red-500" : "")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Images */}
          {currentStep === 2 && (
            <Card className="border-2 pt-0 hover:border-gray-300 transition-colors animate-in fade-in duration-500">
              <CardHeader className="bg-black py-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <ImageIcon className="h-5 w-5" />
                  Logo et Couverture
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Ajoutez les visuels de votre boutique
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {/* Logo */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Logo de la boutique</Label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-gray-200 bg-gray-50 group hover:border-blue-400 transition-colors">
                      {logo ? (
                        <>
                          <img
                            src={logo}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = ""
                              e.currentTarget.style.display = "none"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setValue("logo", "")}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <span className="text-white text-xs font-medium">Changer</span>
                          </button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-400 mb-1" />
                          <p className="text-xs text-gray-400 text-center px-2">Logo</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        if (!file.type.startsWith("image/")) {
                          toast.error("Veuillez sélectionner une image")
                          return
                        }
                        
                        const formData = new FormData()
                        formData.append("file", file)
                        formData.append("folder", "stores/logos")
                        formData.append("type", "image")
                        
                        try {
                          const response = await fetch("/api/upload", {
                            method: "POST",
                            body: formData,
                          })
                          
                          if (!response.ok) throw new Error("Erreur upload")
                          
                          const data = await response.json()
                          setValue("logo", data.fileUrl)
                          toast.success("Logo téléchargé")
                        } catch (error) {
                          toast.error("Erreur lors de l'upload")
                        }
                      }}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault()
                          document.getElementById("logo-upload")?.click()
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {logo ? "Changer le logo" : "Télécharger le logo"}
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 text-center">Format carré recommandé (ex: 500x500px)</p>
                  </div>
                </div>

                {/* Cover Image */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Image de couverture</Label>
                  <div className="relative h-[200px] rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 transition-colors group">
                    {coverImage ? (
                      <>
                        <img
                          src={coverImage}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = ""
                            e.currentTarget.style.display = "none"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setValue("coverImage", "")}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <span className="text-white font-medium">Changer l'image</span>
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 font-medium">Image de couverture</p>
                        <p className="text-xs text-gray-400">Cliquez pour télécharger</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        if (!file.type.startsWith("image/")) {
                          toast.error("Veuillez sélectionner une image")
                          return
                        }
                        
                        const formData = new FormData()
                        formData.append("file", file)
                        formData.append("folder", "stores/covers")
                        formData.append("type", "image")
                        
                        try {
                          const response = await fetch("/api/upload", {
                            method: "POST",
                            body: formData,
                          })
                          
                          if (!response.ok) throw new Error("Erreur upload")
                          
                          const data = await response.json()
                          setValue("coverImage", data.fileUrl)
                          toast.success("Couverture téléchargée")
                        } catch (error) {
                          toast.error("Erreur lors de l'upload")
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Format 16:9 recommandé (ex: 1920x1080px)</p>
                </div>
              </CardContent>
            </Card>
          )}

        </form>

        {/* Fixed Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? () => router.back() : prevStep}
                disabled={isSubmitting}
                className="rounded-full px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {currentStep === 1 ? "Annuler" : "Précédent"}
              </Button>

              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        index + 1 === currentStep ? "w-8 bg-blue-600" : "w-2 bg-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSubmit(handleFormSubmit)}
                disabled={isSubmitting}
                className="rounded-full px-6 bg-black hover:bg-gray-800 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : currentStep === totalSteps ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Créer la boutique
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
