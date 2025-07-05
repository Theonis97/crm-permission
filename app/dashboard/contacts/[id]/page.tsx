"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { PermissionGuard } from "@/components/auth/permission-guard"
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
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Contact } from "@/types/contacts"
import { EditContactSheet } from "@/components/contacts/edit-contact-sheet"
import { DeleteContactDialog } from "@/components/contacts/delete-contact-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("activity")

  // Charger le contact
  const fetchContact = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contacts/${contactId}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Contact non trouvé")
          router.push("/dashboard/contacts")
          return
        }
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setContact(data)
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors du chargement du contact")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (contactId) {
      fetchContact()
    }
  }, [contactId])

  const handleContactUpdated = () => {
    fetchContact()
    setEditSheetOpen(false)
    toast.success("Contact mis à jour avec succès")
  }

  const handleContactDeleted = () => {
    setDeleteDialogOpen(false)
    toast.success("Contact supprimé avec succès")
    router.push("/dashboard/contacts")
  }

  const getContactInitials = (contact: Contact) => {
    if (contact.type === "ENTREPRISE") {
      return contact.firstName?.substring(0, 2).toUpperCase() || "EN"
    }
    const first = contact.firstName?.charAt(0) || ""
    const last = contact.lastName?.charAt(0) || ""
    return (first + last).toUpperCase() || "CO"
  }

  const getContactName = (contact: Contact) => {
    if (contact.type === "ENTREPRISE") {
      return contact.firstName || "Entreprise"
    }
    return `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Sans nom"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROSPECT":
        return "bg-blue-100 text-blue-800"
      case "CLIENT":
        return "bg-green-100 text-green-800"
      case "LEAD":
        return "bg-yellow-100 text-yellow-800"
      case "ARCHIVE":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
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
        <Button onClick={() => router.push("/dashboard/contacts")} className="mt-4">
          Retour aux contacts
        </Button>
      </div>
    )
  }

  return (
    <PermissionGuard permission="contacts.view">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/contacts")}>
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
                <PermissionGuard permission="contacts.edit">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditSheetOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier le contact
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <PermissionGuard permission="contacts.delete">
                        <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
                          <User className="mr-2 h-4 w-4" />
                          Supprimer le contact
                        </DropdownMenuItem>
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </PermissionGuard>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Informations du contact */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardContent className="p-6">
                  {/* Photo et nom */}
                  <div className="text-center mb-6">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src={contact.photo || "/placeholder.svg"} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {getContactInitials(contact)}
                      </AvatarFallback>
                    </Avatar>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{getContactName(contact)}</h1>
                    {contact.job && <p className="text-gray-600 mb-2">{contact.job}</p>}
                    <div className="flex justify-center gap-2 mb-4">
                      <Badge className={getStatusColor(contact.status)}>{contact.status}</Badge>
                      <Badge variant="outline">{contact.type}</Badge>
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                      <Plus className="h-4 w-4" />
                      Log
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                      <Phone className="h-4 w-4" />
                      Appeler
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                      <MoreHorizontal className="h-4 w-4" />
                      Plus
                    </Button>
                  </div>

                  {/* Bouton de conversion */}
                  {contact.status === "LEAD" && (
                    <Button className="w-full mb-6 bg-orange-500 hover:bg-orange-600">Convertir en contact</Button>
                  )}

                  {/* Dernière activité */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Dernière activité : {format(new Date(contact.updatedAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
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
                        {contact.assignedUser && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Propriétaire du contact</label>
                            <div className="text-sm text-gray-900">
                              {contact.assignedUser.firstName} {contact.assignedUser.lastName}
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

                    {/* Tags */}
                    {contact.tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Tags</h3>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
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
                  <TabsTrigger value="meetings" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Réunions
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Documents
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="space-y-6">
                  {/* Activités à venir */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Activités à venir
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Préparer devis pour {getContactName(contact)}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                Aujourd'hui, 12:00
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              Intéressé par notre nouvelle gamme de produits et souhaite notre meilleur prix. Veuillez
                              inclure une ventilation détaillée des coûts.
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Rappel: Aucun rappel</span>
                                <span>
                                  Priorité:{" "}
                                  <Badge variant="destructive" className="text-xs">
                                    Haute
                                  </Badge>
                                </span>
                                <span>
                                  Assigné à: {contact.assignedUser?.firstName} {contact.assignedUser?.lastName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Historique des activités */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Historique des activités
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-gray-500 border-b pb-2">12 Décembre 2021</div>
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckSquare className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">
                                Tâche créée par {contact.assignedUser?.firstName} {contact.assignedUser?.lastName}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                Aujourd'hui, 12:00
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">Préparer devis pour {getContactName(contact)}</p>
                          </div>
                        </div>
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
                        <Button variant="outline" size="sm" className="mt-4 bg-transparent">
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
                        <Button variant="outline" size="sm" className="mt-4 bg-transparent">
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
                        <Button variant="outline" size="sm" className="mt-4 bg-transparent">
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
                      <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-shrink-0 mt-1">
                            <input type="checkbox" className="rounded" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">Préparer devis pour {getContactName(contact)}</h4>
                            <p className="text-sm text-gray-600 mb-2">Intéressé par notre nouvelle gamme de produits</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Échéance: Aujourd'hui</span>
                              <Badge variant="destructive" className="text-xs">
                                Haute
                              </Badge>
                              <span>Assigné à: {contact.assignedUser?.firstName}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="meetings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Réunions
                        </CardTitle>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Nouvelle réunion
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Aucune réunion planifiée avec ce contact</p>
                        <Button variant="outline" size="sm" className="mt-4 bg-transparent">
                          <Plus className="h-4 w-4 mr-2" />
                          Planifier une réunion
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
                        <Button variant="outline" size="sm" className="mt-4 bg-transparent">
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

        {/* Modales */}
        {contact && (
          <>
            <PermissionGuard permission="contacts.edit">
              <EditContactSheet
                open={editSheetOpen}
                onOpenChange={setEditSheetOpen}
                contact={contact}
                onContactUpdated={handleContactUpdated}
              />
            </PermissionGuard>
            <PermissionGuard permission="contacts.delete">
              <DeleteContactDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                contact={contact}
                onContactDeleted={handleContactDeleted}
              />
            </PermissionGuard>
          </>
        )}
      </div>
    </PermissionGuard>
  )
}
