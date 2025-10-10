"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StorePageHeader } from "@/components/stores/store-page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TrendingUp,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Package,
} from "lucide-react"

interface MovementsPageProps {
  params: {
    id: string
  }
}

const mockMovements = [
  { id: "1", type: "IN", product: "Laptop Dell XPS 15", quantity: 10, user: "Admin User", date: "2025-10-10 14:30", reason: "Réapprovisionnement" },
  { id: "2", type: "OUT", product: "iPhone 14 Pro", quantity: 2, user: "Marie Martin", date: "2025-10-10 14:15", reason: "Vente" },
  { id: "3", type: "OUT", product: "Samsung Galaxy S23", quantity: 1, user: "Jean Dupont", date: "2025-10-10 13:45", reason: "Vente" },
  { id: "4", type: "IN", product: "AirPods Pro", quantity: 25, user: "Admin User", date: "2025-10-10 12:30", reason: "Réapprovisionnement" },
  { id: "5", type: "ADJUST", product: "MacBook Air M2", quantity: -2, user: "Admin User", date: "2025-10-10 11:20", reason: "Correction d'inventaire" },
  { id: "6", type: "OUT", product: "Sony PS5", quantity: 1, user: "Sophie Laurent", date: "2025-10-10 10:45", reason: "Vente" },
  { id: "7", type: "IN", product: "Nintendo Switch", quantity: 15, user: "Admin User", date: "2025-10-10 09:15", reason: "Livraison fournisseur" },
]

const getTypeIcon = (type: string) => {
  switch (type) {
    case "IN":
      return <ArrowDownRight className="h-4 w-4 text-green-600" />
    case "OUT":
      return <ArrowUpRight className="h-4 w-4 text-red-600" />
    default:
      return <Package className="h-4 w-4 text-blue-600" />
  }
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case "IN":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Entrée</Badge>
    case "OUT":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Sortie</Badge>
    case "ADJUST":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Ajustement</Badge>
    default:
      return <Badge variant="secondary">{type}</Badge>
  }
}

export default function MovementsPage({ params }: MovementsPageProps) {
  const entriesCount = mockMovements.filter(m => m.type === "IN").length
  const exitsCount = mockMovements.filter(m => m.type === "OUT").length
  const adjustmentsCount = mockMovements.filter(m => m.type === "ADJUST").length

  return (
    <>
      <StorePageHeader
        title="Mouvements de stock"
        description="Suivi des entrées et sorties"
        action={{
          label: "Nouveau mouvement",
          onClick: () => {},
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Mouvements</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockMovements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Entrées</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{entriesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sorties</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{exitsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ajustements</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{adjustmentsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des mouvements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historique des mouvements</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Rechercher..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(movement.type)}
                      {getTypeBadge(movement.type)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{movement.product}</TableCell>
                  <TableCell>
                    <span className={movement.type === "IN" ? "text-green-600 font-semibold" : movement.type === "OUT" ? "text-red-600 font-semibold" : "text-blue-600 font-semibold"}>
                      {movement.type === "OUT" ? "-" : movement.quantity > 0 ? "+" : ""}{movement.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{movement.user}</TableCell>
                  <TableCell className="text-sm text-gray-600">{movement.reason}</TableCell>
                  <TableCell className="text-sm text-gray-600">{movement.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </>
  )
}
