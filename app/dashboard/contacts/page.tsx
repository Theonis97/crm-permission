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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Contact, ContactType, ContactStatus, ContactFilters } from "@/types/contacts"
import { CreateContactSheet } from "@/components/contacts/create-contact-sheet"
import { EditContactSheet } from "@/components/contacts/edit-contact-sheet"
import { DeleteContactDialog } from "@/components/contacts/delete-contact-dialog"
import { toast } from "@/lib/app-toast"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ContactFilters>({})
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

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

  const handleViewContact = (contact: Contact) => {
    router.push(`/dashboard/contacts/${contact.id}`)
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

  const renderGridView = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredContacts.map((contact) => (
        <div
          key={contact.id}
          className="group relative bg-white rounded-2xl border border-gray-200/50 hover:border-blue-300/50 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
          onClick={() => handleViewContact(contact)}
        >
          {/* Gradient d'arrière-plan au hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-purple-50/0 to-pink-50/0 group-hover:from-blue-50/50 group-hover:via-purple-50/30 group-hover:to-pink-50/20 transition-all duration-500" />
          
          {/* Barre colorée en haut */}
          <div className={`h-1.5 ${
            contact.status === 'CLIENT' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
            contact.status === 'PROSPECT' ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
            contact.status === 'LEAD' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
            'bg-gradient-to-r from-gray-400 to-gray-500'
          }`} />

          <div className="relative p-6">
            {/* Header avec avatar */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-white shadow-lg ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all duration-300">
                    <AvatarImage src={contact.photo || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                      {getContactInitials(contact)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    contact.status === 'CLIENT' ? 'bg-green-500' : 
                    contact.status === 'PROSPECT' ? 'bg-blue-500' : 
                    'bg-yellow-500'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {getContactName(contact)}
                  </h3>
                  {contact.job && (
                    <p className="text-sm text-gray-600 line-clamp-1">{contact.job}</p>
                  )}
                </div>
              </div>
              
              <PermissionGuard permission="contacts.edit">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewContact(contact) }}>
                      <Eye className="mr-2 h-4 w-4" /> Voir le détail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditContact(contact) }}>
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </DropdownMenuItem>
                    <PermissionGuard permission="contacts.delete">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact) }} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </PermissionGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </PermissionGuard>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className={`${getStatusColor(contact.status)} font-medium px-3 py-1 rounded-full`}>
                {contact.status}
              </Badge>
              <Badge className={`${getTypeColor(contact.type)} font-medium px-3 py-1 rounded-full`}>
                {contact.type}
              </Badge>
            </div>

            {/* Informations de contact */}
            <div className="space-y-2.5">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600 group/item hover:text-blue-600 transition-colors">
                  <div className="p-1.5 bg-blue-50 rounded-lg group-hover/item:bg-blue-100 transition-colors">
                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="truncate">{contact.email}</span>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 group/item hover:text-green-600 transition-colors">
                  <div className="p-1.5 bg-green-50 rounded-lg group-hover/item:bg-green-100 transition-colors">
                    <Phone className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <span>{contact.phone}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      #{tag}
                    </span>
                  ))}
                  {contact.tags.length > 3 && (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      +{contact.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Assigné à */}
            {contact.assignedUser && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {contact.assignedUser.firstName?.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-600">
                    {contact.assignedUser.firstName} {contact.assignedUser.lastName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const renderTableView = () => (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-200">
              <TableHead className="font-bold text-gray-900">Contact</TableHead>
              <TableHead className="font-bold text-gray-900">Type</TableHead>
              <TableHead className="font-bold text-gray-900">Statut</TableHead>
              <TableHead className="font-bold text-gray-900">Email</TableHead>
              <TableHead className="font-bold text-gray-900">Téléphone</TableHead>
              <TableHead className="font-bold text-gray-900">Assigné à</TableHead>
              <TableHead className="font-bold text-gray-900">Créé le</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact, index) => (
              <TableRow
                key={contact.id}
                className="group cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 transition-all duration-200 border-b border-gray-100"
                onClick={() => handleViewContact(contact)}
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-md ring-1 ring-gray-200 group-hover:ring-blue-300 transition-all duration-300">
                        <AvatarImage src={contact.photo || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {getContactInitials(contact)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        contact.status === 'CLIENT' ? 'bg-green-500' : 
                        contact.status === 'PROSPECT' ? 'bg-blue-500' : 
                        'bg-yellow-500'
                      }`} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {getContactName(contact)}
                      </div>
                      {contact.job && (
                        <div className="text-sm text-gray-600">{contact.job}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${getTypeColor(contact.type)} font-medium px-3 py-1 rounded-full`}>
                    {contact.type === 'PERSONNE' ? '👤 ' : '🏢 '}{contact.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(contact.status)} font-medium px-3 py-1 rounded-full`}>
                    {contact.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors group/email"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-1.5 bg-blue-50 rounded-lg group-hover/email:bg-blue-100 transition-colors">
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-sm">{contact.email}</span>
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors group/phone"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-1.5 bg-green-50 rounded-lg group-hover/phone:bg-green-100 transition-colors">
                        <Phone className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <span className="text-sm">{contact.phone}</span>
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {contact.assignedUser && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {contact.assignedUser.firstName?.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-700">
                        {contact.assignedUser.firstName} {contact.assignedUser.lastName}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">
                    {format(new Date(contact.createdAt), "dd/MM/yyyy", { locale: fr })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <PermissionGuard permission="contacts.edit">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewContact(contact) }}>
                          <Eye className="mr-2 h-4 w-4" /> Voir le détail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditContact(contact) }}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <PermissionGuard permission="contacts.delete">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact) }} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGuard>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  return (
    <PermissionGuard permission="contacts.view">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
        {/* Header Moderne et Sticky */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Contacts
                  </h1>
                  <p className="text-sm text-gray-600">
                    {filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''} au total
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Toggle Vue */}
                <div className="flex items-center bg-gray-100/80 rounded-full p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-4 py-2 rounded-full transition-all duration-300 ${
                      viewMode === "grid"
                        ? "bg-white shadow-md text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-4 py-2 rounded-full transition-all duration-300 ${
                      viewMode === "table"
                        ? "bg-white shadow-md text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                <PermissionGuard permission="contacts.create">
                  <Button 
                    onClick={handleCreateContact}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un contact
                  </Button>
                </PermissionGuard>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <main className="py-8">
          <div className="mx-auto max-w-7xl px-6">

            {/* Filtres Modernes */}
            <div className="mb-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Rechercher par nom, email, poste..."
                    value={filters.search || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="pl-12 h-12 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Select
                    value={filters.type || "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        type: value === "all" ? undefined : (value as ContactType),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px] h-12 rounded-xl border-gray-200 bg-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="PERSONNE">👤 Personne</SelectItem>
                      <SelectItem value="ENTREPRISE">🏢 Entreprise</SelectItem>
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
                    <SelectTrigger className="w-[180px] h-12 rounded-xl border-gray-200 bg-white">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="PROSPECT">🎯 Prospect</SelectItem>
                      <SelectItem value="CLIENT">✅ Client</SelectItem>
                      <SelectItem value="LEAD">💡 Lead</SelectItem>
                      <SelectItem value="ARCHIVE">📦 Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-5 w-32 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20 rounded-full" />
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-block p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full mb-6">
                  <Users className="h-16 w-16 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun contact trouvé</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {filters.search || filters.type || filters.status
                    ? "Aucun contact ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
                    : "Commencez par créer votre premier contact pour développer votre réseau."}
                </p>
                {!filters.search && !filters.type && !filters.status && (
                  <Button 
                    onClick={handleCreateContact}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-8"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Créer votre premier contact
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              renderGridView()
            ) : (
              renderTableView()
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
