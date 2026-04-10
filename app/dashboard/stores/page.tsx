"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Store,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Eye,
  ShoppingCart,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "sonner"

interface StoreData {
  id: string
  name: string
  logo: string | null
  coverImage: string | null
  address: string | null
  phone: string | null
  email: string | null
  whatsapp: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface StoreDataExtended extends StoreData {
  revenue?: number
}

// Données mockées pour les magasins
const mockStores: StoreDataExtended[] = [
  {
    id: "1",
    name: "Magasin Centre-Ville",
    logo: "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
    address: "123 Rue Principale, Douala, Cameroun",
    phone: "+241 6XX XXX 001",
    email: "centre@magasin.cm",
    whatsapp: "+241 6XX XXX 001",
    isActive: true,
    revenue: 1245000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Magasin Akwa",
    logo: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop",
    address: "45 Avenue Akwa, Douala, Cameroun",
    phone: "+241 6XX XXX 002",
    email: "akwa@magasin.cm",
    whatsapp: "+241 6XX XXX 002",
    isActive: true,
    revenue: 890000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Magasin Bonanjo",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&h=400&fit=crop",
    address: "78 Rue Bonanjo, Douala, Cameroun",
    phone: "+241 6XX XXX 003",
    email: "bonanjo@magasin.cm",
    whatsapp: "+241 6XX XXX 003",
    isActive: true,
    revenue: 1580000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Magasin Bépanda",
    logo: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=400&fit=crop",
    address: "90 Rue Bépanda, Douala, Cameroun",
    phone: "+241 6XX XXX 004",
    email: "bepanda@magasin.cm",
    whatsapp: "+241 6XX XXX 004",
    isActive: true,
    revenue: 1120000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export default function StoresPage() {
  const router = useRouter()
  const [stores, setStores] = useState<StoreDataExtended[]>([])
  const [loading, setLoading] = useState(true)
  const { hasPermission, stores: userStores } = usePermissions()

  // Vérifier si l'utilisateur a accès à un magasin spécifique
  const hasStoreAccess = (storeId: string) => {
    // Si l'utilisateur a la permission globale stores.manage, il a accès à tous les magasins
    if (hasPermission("stores.manage")) {
      return true
    }
    // Sinon, vérifier s'il est assigné à ce magasin spécifique
    return userStores.some(store => store.id === storeId)
  }

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/stores")
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const body = data && typeof data === "object" ? (data as { message?: string; error?: string }) : {}
        const msg =
          body.message ||
          body.error ||
          (response.status === 401
            ? "Session expirée ou non authentifié — reconnectez-vous."
            : `Erreur ${response.status} lors du chargement des magasins`)
        throw new Error(msg)
      }

      if (!Array.isArray(data)) {
        throw new Error("Réponse serveur invalide (liste magasins)")
      }

      setStores(data)
    } catch (error) {
      console.error("Error fetching stores:", error)
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du chargement des boutiques"
      )
    } finally {
      setLoading(false)
    }
  }

  // Gérer le clic sur un magasin
  const handleStoreClick = (storeId: string) => {
    if (hasStoreAccess(storeId)) {
      router.push(`/dashboard/stores/${storeId}`)
    } else {
      toast.error("Vous n'avez pas accès à ce magasin")
    }
  }

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${storeName}" ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression")
      }

      toast.success("Boutique supprimée avec succès")
      fetchStores() // Recharger la liste
    } catch (error) {
      console.error("Error deleting store:", error)
      toast.error("Erreur lors de la suppression de la boutique")
    }
  }

  return (
    <PermissionGuard permission="stores.view" fallback={<div>Accès refusé</div>}>
      <ModuleNavbar
        title="Nos Magasins"
        description="Gestion des points de vente"
        icon={Store}
        primaryAction={
          hasPermission("stores.create")
            ? {
                label: "Nouveau magasin",
                onClick: () => router.push("/dashboard/stores/new"),
                icon: Plus,
              }
            : undefined
        }
      />

      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Liste des magasins en grille */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : stores.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Store className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Aucun magasin trouvé</p>
                  <p className="text-sm mt-2 mb-6">Créez votre premier magasin</p>
                  {hasPermission("stores.create") && (
                    <Button
                      onClick={() => router.push("/dashboard/stores/new")}
                      className="rounded-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un magasin
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {stores.map((store) => {
                const hasAccess = hasStoreAccess(store.id)
                return (
                  <Card 
                    key={store.id} 
                    className={`overflow-hidden pt-0 transition-all ${
                      hasAccess 
                        ? "hover:shadow-lg cursor-pointer" 
                        : "opacity-60 cursor-not-allowed"
                    }`}
                    onClick={() => handleStoreClick(store.id)}
                  >
                  {/* Cover Image */}
                  <div className="h-32 bg-gradient-to-br from-blue-500 to-blue-600 relative">
                    {store.coverImage ? (
                      <img src={store.coverImage} alt={store.name} className="w-full h-full object-cover" />
                    ) : null}
                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleStoreClick(store.id)}
                            disabled={!hasAccess}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir la boutique
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => hasAccess ? router.push(`/dashboard/stores/${store.id}/orders`) : toast.error("Accès refusé")}
                            disabled={!hasAccess}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Voir les commandes
                          </DropdownMenuItem>
                          {hasPermission("stores.update") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/stores/${store.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            </>
                          )}
                          {hasPermission("stores.delete") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteStore(store.id, store.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <CardContent className="pt-6">
                    {/* Logo et Nom */}
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar className="h-12 w-12 border-2 border-white -mt-8 shadow-lg">
                        <AvatarImage src={store.logo || undefined} alt={store.name} />
                        <AvatarFallback className="bg-blue-600 text-white font-semibold">
                          {store.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">{store.name}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={store.isActive ? "default" : "secondary"}>
                            {store.isActive ? "Actif" : "Inactif"}
                          </Badge>
                          {!hasAccess && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                              Accès restreint
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informations */}
                    <div className="space-y-2 text-sm min-h-[80px]">
                      {store.address && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{store.address}</span>
                        </div>
                      )}
                      {store.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                      {store.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{store.email}</span>
                        </div>
                      )}
                      {!store.address && !store.phone && !store.email && (
                        <div className="text-gray-400 text-sm italic">Aucune information de contact</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  )
}
