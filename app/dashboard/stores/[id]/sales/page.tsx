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
  ShoppingCart,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react"

interface SalesPageProps {
  params: {
    id: string
  }
}

const mockSales = [
  { id: "CMD-001", customer: "Jean Dupont", items: 3, total: 45000, status: "pending", date: "2025-10-10 14:30" },
  { id: "CMD-002", customer: "Marie Martin", items: 2, total: 78500, status: "completed", date: "2025-10-10 14:15" },
  { id: "CMD-003", customer: "Paul Bernard", items: 5, total: 32000, status: "completed", date: "2025-10-10 13:45" },
  { id: "CMD-004", customer: "Sophie Laurent", items: 4, total: 120000, status: "pending", date: "2025-10-10 12:30" },
  { id: "CMD-005", customer: "Alice Durand", items: 2, total: 55000, status: "processing", date: "2025-10-10 11:20" },
  { id: "CMD-006", customer: "Bob Martin", items: 6, total: 92000, status: "completed", date: "2025-10-10 10:45" },
  { id: "CMD-007", customer: "Claire Petit", items: 3, total: 67000, status: "cancelled", date: "2025-10-10 09:15" },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Complétée</Badge>
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente</Badge>
    case "processing":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">En cours</Badge>
    case "cancelled":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulée</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function SalesPage({ params }: SalesPageProps) {
  return (
    <>
      <StorePageHeader
        title="Ventes"
        description="Gérer les ventes du magasin"
        action={{
          label: "Nouvelle vente",
          onClick: () => {},
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockSales.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En attente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {mockSales.filter(o => o.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En cours</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {mockSales.filter(o => o.status === "processing").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Complétées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockSales.filter(o => o.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des ventes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des ventes</CardTitle>
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
                <TableHead>N° Vente</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>{sale.customer}</TableCell>
                  <TableCell>{sale.items} articles</TableCell>
                  <TableCell>{(sale.total / 1000).toFixed(0)}k FCFA</TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{sale.date}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Voir</Button>
                  </TableCell>
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
