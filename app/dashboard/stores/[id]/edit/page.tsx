"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "@/components/upload/image-upload"
import { ManagerSelector } from "@/components/stores/manager-selector"
import {
  Store,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Schéma de validation
const storeSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  isActive: z.boolean().optional(),
  managerId: z.string().nullable().optional(),
})

type StoreFormData = z.infer<typeof storeSchema>

interface EditStorePageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditStorePage({ params }: EditStorePageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [storeName, setStoreName] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      isActive: true,
    },
  })

  const logo = watch("logo")
  const coverImage = watch("coverImage")
  const isActive = watch("isActive")

  // Charger les données du store
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await fetch(`/api/stores/${id}`)
        
        if (!response.ok) {
          throw new Error("Boutique introuvable")
        }

        const store = await response.json()
        setStoreName(store.name)
        
        // Remplir le formulaire
        setValue("name", store.name)
        setValue("logo", store.logo || "")
        setValue("coverImage", store.coverImage || "")
        setValue("address", store.address || "")
        setValue("phone", store.phone || "")
        setValue("email", store.email || "")
        setValue("whatsapp", store.whatsapp || "")
        setValue("isActive", store.isActive)
        setValue("managerId", store.managerId || null)
      } catch (error) {
        toast.error("Erreur", {
          description: error instanceof Error ? error.message : "Impossible de charger la boutique",
        })
        router.push("/dashboard/stores")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStore()
  }, [id, setValue, router])

  const onSubmit = async (data: StoreFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la mise à jour")
      }

      const store = await response.json()
      
      toast.success("Boutique mise à jour!", {
        description: `${store.name} a été modifiée avec succès.`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
      
      router.push("/dashboard/stores")
      router.refresh()
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de modifier la boutique",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la suppression")
      }

      toast.success("Boutique supprimée", {
        description: "La boutique a été supprimée avec succès.",
      })
      
      router.push("/dashboard/stores")
      router.refresh()
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de supprimer la boutique",
      })
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Chargement de la boutique...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-6 w-6 text-blue-600" />
                  Modifier la Boutique
                </h1>
                <p className="text-sm text-gray-600">{storeName}</p>
              </div>
            </div>

            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-full"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Confirmer la suppression
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer <strong>{storeName}</strong> ?
                    Cette action est irréversible et supprimera toutes les données associées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      "Supprimer"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations générales */}
          <Card className="border-2 hover:border-blue-200 transition-colors">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Store className="h-5 w-5" />
                Informations Générales
              </CardTitle>
              <CardDescription>
                Modifiez les informations de base de votre boutique
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
                  className={errors.name ? "border-red-500 rounded-full" : "rounded-full"}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Statut */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Statut de la boutique</Label>
                  <p className="text-sm text-gray-600">
                    {isActive ? "La boutique est active" : "La boutique est inactive"}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                />
              </div>

              {/* Manager */}
              <ManagerSelector
                value={watch("managerId")}
                onChange={(managerId) => setValue("managerId", managerId)}
                disabled={isSubmitting}
              />

              {/* Images */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Logo */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Logo</Label>
                  <ImageUpload
                    value={logo}
                    onChange={(url) => setValue("logo", url)}
                    folder="stores/logos"
                    aspectRatio="square"
                    label="Télécharger le logo"
                  />
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Image de couverture</Label>
                  <ImageUpload
                    value={coverImage}
                    onChange={(url) => setValue("coverImage", url)}
                    folder="stores/covers"
                    aspectRatio="video"
                    label="Télécharger la couverture"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coordonnées */}
          <Card className="border-2 hover:border-purple-200 transition-colors">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <MapPin className="h-5 w-5" />
                Coordonnées
              </CardTitle>
              <CardDescription>
                Modifiez les informations de contact de la boutique
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
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
              <div className="grid md:grid-cols-3 gap-4">
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
                    className={errors.email ? "border-red-500 rounded-full" : "rounded-full"}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
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
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 rounded-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
