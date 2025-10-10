"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Users, Search, Plus, Mail, Phone, TrendingUp } from "lucide-react"

interface ContactsPageProps {
  params: {
    id: string
  }
}

const mockContacts = [
  { id: "1", name: "Jean Dupont", email: "jean.dupont@email.com", phone: "+237 6XX XXX 111", orders: 15, totalSpent: 675000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean" },
  { id: "2", name: "Marie Martin", email: "marie.martin@email.com", phone: "+237 6XX XXX 222", orders: 23, totalSpent: 1240000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie" },
  { id: "3", name: "Paul Bernard", email: "paul.bernard@email.com", phone: "+237 6XX XXX 333", orders: 8, totalSpent: 320000, type: "prospect", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Paul" },
  { id: "4", name: "Sophie Laurent", email: "sophie.laurent@email.com", phone: "+237 6XX XXX 444", orders: 31, totalSpent: 1850000, type: "vip", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie" },
  { id: "5", name: "Alice Durand", email: "alice.durand@email.com", phone: "+237 6XX XXX 555", orders: 12, totalSpent: 540000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" },
  { id: "6", name: "Bob Martin", email: "bob.martin@email.com", phone: "+237 6XX XXX 666", orders: 5, totalSpent: 180000, type: "client", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
]

const getTypeBadge = (type: string) => {
  switch (type) {
    case "vip":
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">VIP</Badge>
    case "client":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Client</Badge>
    case "prospect":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Prospect</Badge>
    default:
      return <Badge variant="secondary">{type}</Badge>
  }
}

export default function ContactsPage({ params }: ContactsPageProps) {
  return (
    <>
      <StorePageHeader
        title="Contacts"
        description="Gérer les clients du magasin"
        action={{
          label: "Nouveau contact",
          onClick: () => {},
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockContacts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clients VIP</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {mockContacts.filter(c => c.type === "vip").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clients Actifs</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockContacts.filter(c => c.type === "client").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Prospects</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {mockContacts.filter(c => c.type === "prospect").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Rechercher un contact..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des contacts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockContacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.avatar} alt={contact.name} />
                  <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                    {getTypeBadge(contact.type)}
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
      </div>
    </>
  )
}
