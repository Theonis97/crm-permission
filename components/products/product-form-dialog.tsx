"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, Loader2, X, ImagePlus, Upload, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  photos: string[]
  prixVente: number
  prixAchat: number
  tva: number
  stock: number
  minStock: number
  maxStock: number | null
  categoryId: string
  brandId: string | null
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  product?: Product | null
}

export function ProductFormDialog({
  open,
  onOpenChange,
  onSuccess,
  product,
}: ProductFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [photos, setPhotos] = useState<string[]>([])
  const [photoInput, setPhotoInput] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    prixVente: "",
    prixAchat: "",
    tva: "20",
    stock: "0",
    minStock: "10",
    maxStock: "",
    categoryId: "",
    brandId: "",
  })

  useEffect(() => {
    if (open) {
      loadData()
      setCurrentStep(1) // Reset à l'étape 1
      if (product) {
        // Mode édition
        setFormData({
          name: product.name,
          sku: product.sku || "",
          description: product.description || "",
          prixVente: product.prixVente.toString(),
          prixAchat: product.prixAchat.toString(),
          tva: product.tva.toString(),
          stock: product.stock.toString(),
          minStock: product.minStock.toString(),
          maxStock: product.maxStock?.toString() || "",
          categoryId: product.categoryId,
          brandId: product.brandId || "",
        })
        setPhotos(product.photos || [])
      } else {
        // Mode création - reset
        resetForm()
      }
    }
  }, [open, product])

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      prixVente: "",
      prixAchat: "",
      tva: "20",
      stock: "0",
      minStock: "10",
      maxStock: "",
      categoryId: "",
      brandId: "",
    })
    setPhotos([])
    setPhotoInput("")
  }

  const loadData = async () => {
    try {
      setLoadingData(true)
      const [categoriesRes, brandsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/brands"),
      ])
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
      
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoadingData(false)
    }
  }

  const handleAddPhoto = () => {
    if (photoInput.trim()) {
      // Vérifier si c'est une URL valide
      try {
        new URL(photoInput.trim())
        setPhotos([...photos, photoInput.trim()])
        setPhotoInput("")
      } catch {
        toast.error("URL d'image invalide")
      }
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Vérifier que c'est une image
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} n'est pas une image`)
          continue
        }

        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} est trop lourd (max 5MB)`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'products')
        formData.append('type', 'image')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Erreur lors de l\'upload')
        }

        const data = await response.json()
        
        if (data.fileUrl) {
          setPhotos(prev => [...prev, data.fileUrl])
          toast.success(`${file.name} uploadé avec succès`)
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erreur lors de l\'upload des images')
    } finally {
      setUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("Le nom est requis")
          return false
        }
        if (!formData.categoryId) {
          toast.error("La catégorie est requise")
          return false
        }
        return true
      case 2:
        if (!formData.prixVente || !formData.prixAchat) {
          toast.error("Les prix sont requis")
          return false
        }
        return true
      case 3:
        // Stock validation (optionnel)
        return true
      case 4:
        // Images validation (optionnel)
        return true
      default:
        return true
    }
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Si on n'est pas à la dernière étape, passer à la suivante
    if (currentStep < 4) {
      handleNextStep()
      return
    }

    setLoading(true)

    try {
      const url = product ? `/api/products/${product.id}` : "/api/products"
      const method = product ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          sku: formData.sku.trim() || null,
          description: formData.description.trim() || null,
          prixVente: Number(formData.prixVente),
          prixAchat: Number(formData.prixAchat),
          tva: Number(formData.tva),
          stock: Number(formData.stock),
          minStock: Number(formData.minStock) || 0,
          maxStock: formData.maxStock ? Number(formData.maxStock) : null,
          categoryId: formData.categoryId,
          brandId: formData.brandId || null,
          photos: photos,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'enregistrement")
      }

      toast.success(product ? "Produit modifié avec succès" : "Produit créé avec succès")
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Error saving product:", error)
      toast.error(error.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[800px] h-[95vh] p-0 flex flex-col gap-0">
        {/* Header fixe */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle>
                  {product ? "Modifier le produit" : "Nouveau produit"}
                </DialogTitle>
                <DialogDescription>
                  Étape {currentStep}/4 : {
                    currentStep === 1 ? "Informations" :
                    currentStep === 2 ? "Tarification" :
                    currentStep === 3 ? "Gestion du stock" :
                    "Images du produit"
                  }
                </DialogDescription>
              </div>
            </div>
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step < currentStep ? "bg-green-500 text-white" :
                    step === currentStep ? "bg-blue-950 text-white" :
                    "bg-gray-300 text-gray-600"
                  }`}>
                    {step}
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 transition-colors ${
                      step < currentStep ? "bg-green-500" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Contenu scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6">
          
          {/* Étape 1 : Informations */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Informations du produit</h3>
                <p className="text-sm text-gray-500 mt-1">Détails, catégorie et description</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nom du produit <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="iPhone 14 Pro"
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">
                    Catégorie <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                    disabled={loadingData}
                  >
                    <SelectTrigger id="categoryId" className="h-12">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandId">Marque</Label>
                  <Select
                    value={formData.brandId || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        brandId: value === "none" ? "" : value,
                      })
                    }
                    disabled={loadingData}
                  >
                    <SelectTrigger id="brandId" className="h-12">
                      <SelectValue placeholder="Sélectionner une marque (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune marque</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Référence</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sku: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="PROD-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Description détaillée du produit..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Étape 2 : Tarification */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Tarification</h3>
                <p className="text-sm text-gray-500 mt-1">Prix d'achat, de vente et TVA</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="prixAchat">
                    Prix d'achat (HT) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prixAchat"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prixAchat}
                    onChange={(e) =>
                      setFormData({ ...formData, prixAchat: e.target.value })
                    }
                    placeholder="0.00"
                    required
                    className="text-lg h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Prix auquel vous achetez ce produit
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prixVente">
                    Prix de vente (HT) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prixVente"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prixVente}
                    onChange={(e) =>
                      setFormData({ ...formData, prixVente: e.target.value })
                    }
                    placeholder="0.00"
                    required
                    className="text-lg h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Prix auquel vous vendez ce produit
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tva">TVA (%)</Label>
                  <Input
                    id="tva"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tva}
                    onChange={(e) =>
                      setFormData({ ...formData, tva: e.target.value })
                    }
                    placeholder="20"
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Taux de TVA applicable (par défaut 20%)
                  </p>
                </div>

                {formData.prixVente && formData.prixAchat && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Marge brute:</span>
                        <span className="font-semibold text-gray-900">
                          {(Number(formData.prixVente) - Number(formData.prixAchat)).toFixed(2)} XAF
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Marge (%):</span>
                        <span className="font-semibold text-green-600">
                          {((Number(formData.prixVente) - Number(formData.prixAchat)) / Number(formData.prixAchat) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 3 : Gestion du stock */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Gestion du stock</h3>
                <p className="text-sm text-gray-500 mt-1">Quantités et seuils d'alerte</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock {product ? "actuel" : "initial"}</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    placeholder="0"
                    className="text-lg h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Quantité {product ? "actuelle" : "initiale"} en stock
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock minimum (alerte)</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    placeholder="10"
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Seuil d'alerte : vous serez alerté si le stock descend en dessous
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStock">Stock maximum</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    min="0"
                    value={formData.maxStock}
                    onChange={(e) =>
                      setFormData({ ...formData, maxStock: e.target.value })
                    }
                    placeholder="1000"
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Stock maximum recommandé (optionnel)
                  </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <p className="font-medium">Conseil de gestion</p>
                      <p className="text-xs mt-1">
                        Un stock minimum bien défini vous permet d'éviter les ruptures.
                        Le stock maximum aide à limiter le sur-stockage.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 4 : Images */}
          {currentStep === 4 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Images du produit</h3>
                <p className="text-sm text-gray-500 mt-1">Ajoutez des photos pour présenter votre produit</p>
              </div>

              <div className="space-y-4">
                {/* Méthodes d'ajout d'images */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Upload via fichier */}
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="text-sm font-medium">
                      Upload depuis votre ordinateur
                    </Label>
                    <div className="relative">
                      <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload"
                        className={`flex items-center justify-center gap-2 w-full h-12 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                          uploadingImage
                            ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                            : "border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400"
                        }`}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">Upload en cours...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">Choisir des fichiers</span>
                          </>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Images uniquement, max 5MB par fichier
                    </p>
                  </div>

                  {/* Ajout via URL */}
                  <div className="space-y-2">
                    <Label htmlFor="photoInput" className="text-sm font-medium">
                      Ou ajouter une URL d'image
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="photoInput"
                        type="url"
                        value={photoInput}
                        onChange={(e) => setPhotoInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddPhoto()
                          }
                        }}
                        placeholder="https://exemple.com/image.jpg"
                        disabled={uploadingImage}
                      />
                      <Button
                        type="button"
                        onClick={handleAddPhoto}
                        disabled={!photoInput.trim() || uploadingImage}
                        size="icon"
                        variant="outline"
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Liste des images */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>`
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Zone vide */}
                {photos.length === 0 && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImagePlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Aucune image ajoutée</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Uploadez des fichiers ou ajoutez des URLs d'images ci-dessus
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>

          {/* Footer fixe */}
          <div className="shrink-0 border-t bg-white px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              {currentStep === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="w-full"
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading || loadingData} className="w-full">
                    Suivant
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={loading}
                    className="w-full"
                  >
                    Précédent
                  </Button>
                  <Button type="submit" disabled={loading || loadingData} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentStep < 4 ? "Suivant" : (product ? "Modifier le produit" : "Créer le produit")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
