"use client"

import { useState, use } from "react"
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
} from "lucide-react"
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

const mockContacts = [
  { id: "1", name: "Jean Dupont", email: "jean.dupont@email.com", phone: "+241 0X XX XX 111", orders: 15, totalSpent: 675000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean" },
  { id: "2", name: "Marie Martin", email: "marie.martin@email.com", phone: "+241 0X XX XX 222", orders: 23, totalSpent: 1240000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie" },
  { id: "3", name: "Paul Bernard", email: "paul.bernard@email.com", phone: "+241 0X XX XX 333", orders: 8, totalSpent: 320000, type: "prospect", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Paul" },
  { id: "4", name: "Sophie Laurent", email: "sophie.laurent@email.com", phone: "+241 0X XX XX 444", orders: 31, totalSpent: 1850000, type: "vip", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie" },
  { id: "5", name: "Alice Durand", email: "alice.durand@email.com", phone: "+241 0X XX XX 555", orders: 12, totalSpent: 540000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" },
  { id: "6", name: "Bob Martin", email: "bob.martin@email.com", phone: "+241 0X XX XX 666", orders: 5, totalSpent: 180000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
]

export default function ContactsPage({ params }: ContactsPageProps) {
  const router = useRouter()
  const { id: storeId } = use(params)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || contact.type === typeFilter
    return matchesSearch && matchesType
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

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {viewMode === "grid" ? (
              <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.map((contact) => (
                  <Card 
                    key={contact.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewContact(contact.id)}
                  >
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contact.avatar} alt={contact.name} />
                          <AvatarFallback>{getContactInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                            {contact.type === 'vip' ? (
                              <Badge className="bg-purple-100 text-purple-700">VIP</Badge>
                            ) : contact.type === 'client' ? (
                              <Badge className="bg-green-100 text-green-700">Client</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700">Prospect</Badge>
                            )}
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span>{contact.phone}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{contact.orders} commandes</span>
                              <span className="font-semibold text-gray-900">
                                {(contact.totalSpent / 1000).toFixed(0)}k FCFA
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Téléphone</TableHead>
                    <TableHead className="font-semibold">Commandes</TableHead>
                    <TableHead className="font-semibold">Total dépensé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow 
                      key={contact.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewContact(contact.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback>{getContactInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{contact.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.type === 'vip' ? (
                          <Badge className="bg-purple-100 text-purple-700">VIP</Badge>
                        ) : contact.type === 'client' ? (
                          <Badge className="bg-green-100 text-green-700">Client</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700">Prospect</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                          {contact.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        {contact.orders} commandes
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {(contact.totalSpent / 1000).toFixed(0)}k FCFA
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
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
