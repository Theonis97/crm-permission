"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  Grid3X3, 
  List,
  Loader2,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ContactsPageProps {
  params: Promise<{
    id: string
  }>
}

interface StoreContact {
  id: string
  storeId: string
  contactId: string
  totalOrders: number
  totalSpent: number
  lastOrderAt: string | null
  contact: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    photo: string | null
    status: string
  }
}

export default function ContactsPage({ params }: ContactsPageProps) {
  const router = useRouter()
  const { id: storeId } = use(params)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [contacts, setContacts] = useState<StoreContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${storeId}/contacts`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des contacts")
      }

      const data = await response.json()
      setContacts(data)
    } catch (error) {
      console.error("Error loading contacts:", error)
      toast.error("Erreur lors du chargement des contacts")
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(storeContact => {
    const contact = storeContact.contact
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
    
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone?.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getContactInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  const handleViewContact = (contactId: string) => {
    router.push(`/dashboard/stores/${storeId}/contacts/${contactId}`)
  }

  return (
    <>
      <div className="border-b bg-white px-6 py-2.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600">Gestion des clients du magasin</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Vue */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <Button className="bg-blue-900 hover:bg-blue-900 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Créer un contact
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Filtres et recherche */}
        <Card className="gap-0">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher par client, email, téléphone..."
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="PROSPECT">Prospect</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="ARCHIVE">Archivé</SelectItem>
                  </SelectContent>
                </Select>
                
                <Badge variant="outline" className="ml-auto">
                  {contacts.length} contact{contacts.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-600">Chargement des contacts...</p>
                </div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Users className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-600">Aucun contact trouvé</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || statusFilter !== "all" 
                    ? "Essayez de modifier vos filtres"
                    : "Commencez par créer un nouveau contact"}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.map((storeContact) => {
                  const contact = storeContact.contact
                  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Sans nom"
                  const avatar = contact.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`
                  
                  return (
                    <Card 
                      key={storeContact.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewContact(contact.id)}
                    >
                      <CardContent>
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={avatar} alt={fullName} />
                            <AvatarFallback>{getContactInitials(fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-gray-900">{fullName}</h3>
                              {contact.status === 'CLIENT' ? (
                                <Badge className="bg-green-100 text-green-700">Client</Badge>
                              ) : contact.status === 'PROSPECT' ? (
                                <Badge className="bg-blue-100 text-blue-700">Prospect</Badge>
                              ) : contact.status === 'LEAD' ? (
                                <Badge className="bg-purple-100 text-purple-700">Lead</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700">Archivé</Badge>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              {contact.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{contact.email}</span>
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone className="h-3 w-3" />
                                  <span>{contact.phone}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{storeContact.totalOrders} commande{storeContact.totalOrders > 1 ? 's' : ''}</span>
                                <span className="font-semibold text-gray-900">
                                  {(storeContact.totalSpent / 1000).toFixed(0)}k FCFA
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Téléphone</TableHead>
                    <TableHead className="font-semibold">Commandes</TableHead>
                    <TableHead className="font-semibold">Total dépensé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((storeContact) => {
                    const contact = storeContact.contact
                    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Sans nom"
                    const avatar = contact.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`
                    
                    return (
                      <TableRow 
                        key={storeContact.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewContact(contact.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={avatar} />
                              <AvatarFallback>{getContactInitials(fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium">{fullName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.status === 'CLIENT' ? (
                            <Badge className="bg-green-100 text-green-700">Client</Badge>
                          ) : contact.status === 'PROSPECT' ? (
                            <Badge className="bg-blue-100 text-blue-700">Prospect</Badge>
                          ) : contact.status === 'LEAD' ? (
                            <Badge className="bg-purple-100 text-purple-700">Lead</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">Archivé</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                              {contact.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {storeContact.totalOrders} commande{storeContact.totalOrders > 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {(storeContact.totalSpent / 1000).toFixed(0)}k FCFA
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
