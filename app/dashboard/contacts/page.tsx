"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Plus,
  Users,
  Building2,
  Mail,
  Phone,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Grid3X3,
  List,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Contact, ContactType, ContactStatus, ContactFilters } from "@/types/contacts"
import { CreateContactSheet } from "@/components/contacts/create-contact-sheet"
import { EditContactSheet } from "@/components/contacts/edit-contact-sheet"
import { DeleteContactDialog } from "@/components/contacts/delete-contact-dialog"
import { toast } from "sonner"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ContactFilters>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // États pour les modales
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Charger les contacts
  const fetchContacts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filters.search) params.append("search", filters.search)
      if (filters.type) params.append("type", filters.type)
      if (filters.status) params.append("status", filters.status)
      if (filters.assignedUserId) params.append("assignedUserId", filters.assignedUserId)

      const response = await fetch(`/api/contacts?${params}`)
      if (!response.ok) throw new Error("Erreur lors du chargement")

      const data = await response.json()
      setContacts(data)
      setFilteredContacts(data)
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors du chargement des contacts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [filters])

  // Filtrage local pour la recherche en temps réel
  useEffect(() => {
    let filtered = contacts

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (contact) =>
          contact.firstName?.toLowerCase().includes(searchLower) ||
          contact.lastName?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.job?.toLowerCase().includes(searchLower),
      )
    }

    setFilteredContacts(filtered)
  }, [contacts, filters.search])

  // Gestionnaires d'événements
  const handleCreateContact = () => {
    setCreateSheetOpen(true)
  }

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact)
    setEditSheetOpen(true)
  }

  const handleDeleteContact = (contact: Contact) => {
    setSelectedContact(contact)
    setDeleteDialogOpen(true)
  }

  const handleContactCreated = () => {
    fetchContacts()
    setCreateSheetOpen(false)
    toast.success("Contact créé avec succès")
  }

  const handleContactUpdated = () => {
    fetchContacts()
    setEditSheetOpen(false)
    setSelectedContact(null)
    toast.success("Contact mis à jour avec succès")
  }

  const handleContactDeleted = () => {
    fetchContacts()
    setDeleteDialogOpen(false)
    setSelectedContact(null)
    toast.success("Contact supprimé avec succès")
  }

  const handleExport = () => {
    toast.info("Export en cours de développement")
  }

  const handleImport = () => {
    toast.info("Import en cours de développement")
  }

  // Utilitaires
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

  const getStatusColor = (status: ContactStatus) => {
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

  const getTypeColor = (type: ContactType) => {
    switch (type) {
      case "PERSONNE":
        return "bg-purple-100 text-purple-800"
      case "ENTREPRISE":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <PermissionGuard permission="contacts.view">
      <div className="min-h-screen bg-gray-50">
        <ModuleNavbar
          title="Contacts"
          description="Gérez votre base de données clients et prospects"
          icon={Users}
          primaryAction={{
            label: "Nouveau contact",
            onClick: handleCreateContact,
            icon: Plus,
          }}
          secondaryActions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer des contacts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter la liste
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                  {viewMode === "grid" ? (
                    <>
                      <List className="h-4 w-4 mr-2" />
                      Vue liste
                    </>
                  ) : (
                    <>
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Vue grille
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Statistiques */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{contacts.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prospects</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{contacts.filter((c) => c.status === "PROSPECT").length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{contacts.filter((c) => c.status === "CLIENT").length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Entreprises</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{contacts.filter((c) => c.type === "ENTREPRISE").length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filtres et recherche */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher un contact..."
                  value={filters.search || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: value === "all" ? undefined : (value as ContactType),
                  }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="PERSONNE">Personne</SelectItem>
                  <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value === "all" ? undefined : (value as ContactStatus),
                  }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="ARCHIVE">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Liste des contacts */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucun contact trouvé</h3>
                <p className="text-muted-foreground">
                  {filters.search || filters.type || filters.status
                    ? "Aucun contact ne correspond à vos critères de recherche."
                    : "Commencez par créer votre premier contact."}
                </p>
                {!filters.search && !filters.type && !filters.status && (
                  <Button onClick={handleCreateContact} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={contact.photo || "/placeholder.svg"} />
                            <AvatarFallback>{getContactInitials(contact)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{getContactName(contact)}</h3>
                            {contact.job && <p className="text-sm text-muted-foreground">{contact.job}</p>}
                          </div>
                        </div>
                        <PermissionGuard permission="contacts.edit">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <PermissionGuard permission="contacts.delete">
                                <DropdownMenuItem onClick={() => handleDeleteContact(contact)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </PermissionGuard>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </PermissionGuard>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getStatusColor(contact.status)}>{contact.status}</Badge>
                        <Badge className={getTypeColor(contact.type)}>{contact.type}</Badge>
                      </div>

                      {contact.email && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="mr-2 h-4 w-4" />
                          <a href={`mailto:${contact.email}`} className="hover:underline">
                            {contact.email}
                          </a>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="mr-2 h-4 w-4" />
                          <a href={`tel:${contact.phone}`} className="hover:underline">
                            {contact.phone}
                          </a>
                        </div>
                      )}

                      {contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{contact.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {contact.assignedUser && (
                        <div className="text-xs text-muted-foreground">
                          Assigné à {contact.assignedUser.firstName} {contact.assignedUser.lastName}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Modales */}
        <PermissionGuard permission="contacts.create">
          <CreateContactSheet
            open={createSheetOpen}
            onOpenChange={setCreateSheetOpen}
            onContactCreated={handleContactCreated}
          />
        </PermissionGuard>

        {selectedContact && (
          <>
            <PermissionGuard permission="contacts.edit">
              <EditContactSheet
                open={editSheetOpen}
                onOpenChange={setEditSheetOpen}
                contact={selectedContact}
                onContactUpdated={handleContactUpdated}
              />
            </PermissionGuard>
            <PermissionGuard permission="contacts.delete">
              <DeleteContactDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                contact={selectedContact}
                onContactDeleted={handleContactDeleted}
              />
            </PermissionGuard>
          </>
        )}
      </div>
    </PermissionGuard>
  )
}
