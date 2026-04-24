"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  User,
  Activity,
  PhoneCall,
  CheckSquare,
  Users,
  Folder,
  StickyNote,
  ShoppingBag,
  Star,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/lib/app-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  type: string
  status: string
  avatar?: string
  job?: string
  orders: number
  totalSpent: number
}

export default function StoreContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.id as string
  const contactId = params.contactId as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("activity")

  // Mock data pour la démo
  useEffect(() => {
    // Simulation d'un chargement
    setTimeout(() => {
      setContact({
        id: contactId,
        name: "Jean Dupont",
        email: "jean.dupont@email.com",
        phone: "+241 0X XX XX 111",
        type: "client",
        status: "active",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean",
        job: "Directeur Commercial",
        orders: 15,
        totalSpent: 675000,
      })
      setLoading(false)
    }, 500)
  }, [contactId])

  const getContactInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Actif</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-700">Inactif</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "vip":
        return <Badge className="bg-purple-100 text-purple-700">VIP</Badge>
      case "client":
        return <Badge className="bg-blue-100 text-blue-700">Client</Badge>
      case "prospect":
        return <Badge className="bg-amber-100 text-amber-700">Prospect</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Contact non trouvé</h3>
        <Button onClick={() => router.push(`/dashboard/stores/${storeId}/contacts`)} className="mt-4">
          Retour aux contacts
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/stores/${storeId}/contacts`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux contacts
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Rechercher activité, notes, emails..." className="pl-10 w-80" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier le contact
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <User className="mr-2 h-4 w-4" />
                    Supprimer le contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Informations du contact */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {/* Photo et nom */}
                <div className="text-center mb-6">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getContactInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{contact.name}</h1>
                  {contact.job && <p className="text-gray-600 mb-2">{contact.job}</p>}
                  <div className="flex justify-center gap-2 mb-4">
                    {getStatusBadge(contact.status)}
                    {getTypeBadge(contact.type)}
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Log
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Appeler
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Plus
                  </Button>
                </div>

                {/* Stats client */}
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Commandes</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{contact.orders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total dépensé</span>
                    <span className="text-lg font-bold text-green-600">
                      {(contact.totalSpent / 1000).toFixed(0)}k FCFA
                    </span>
                  </div>
                </div>

                {/* Informations du contact */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Informations contact</h3>
                    <div className="space-y-3">
                      {contact.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <div className="text-sm text-gray-900">
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {contact.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Téléphone</label>
                          <div className="text-sm text-gray-900">
                            <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                              {contact.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {contact.job && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Fonction</label>
                          <div className="text-sm text-gray-900">{contact.job}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activité
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Commandes
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="emails" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emails
                </TabsTrigger>
                <TabsTrigger value="calls" className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4" />
                  Appels
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Tâches
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Documents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-6">
                {/* Activités récentes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Activités récentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Nouvelle commande #12345</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              Il y a 2 heures
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Commande passée pour un montant de 45,000 FCFA
                          </p>
                          <Badge className="bg-green-100 text-green-700">Complétée</Badge>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <PhoneCall className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Appel téléphonique</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              Il y a 1 jour
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            Discussion sur les nouveaux produits disponibles
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        Historique des commandes ({contact.orders})
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvelle commande
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Commande #{12345 - i}</h4>
                              <span className="font-semibold text-gray-900">
                                {(45000 + i * 10000).toLocaleString()} FCFA
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(2024, 11, 25 - i), "d MMM yyyy", { locale: fr })}
                              </span>
                              <Badge className="bg-green-100 text-green-700">Livrée</Badge>
                            </div>
                            <p className="text-sm text-gray-600">3 articles</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <StickyNote className="h-5 w-5" />
                        Notes
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvelle note
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <StickyNote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucune note pour ce contact</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emails" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Emails
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvel email
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun email pour ce contact</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Envoyer un email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calls" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <PhoneCall className="h-5 w-5" />
                        Appels
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvel appel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <PhoneCall className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun appel enregistré pour ce contact</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Enregistrer un appel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5" />
                        Tâches
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvelle tâche
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucune tâche pour ce contact</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une tâche
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5" />
                        Documents
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau document
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun document associé à ce contact</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
