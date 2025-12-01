"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Package, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Truck,
  DollarSign,
  AlertCircle
} from "lucide-react"

interface TodayOrder {
  id: string
  number: string
  status: string
  total: number
  deliveryFee: number
  createdAt: string
  deliveredAt: string | null
  customerName: string
  customerPhone: string
  deliveryAddress: string | null
}

interface TodayOrdersStats {
  delivered: number
  delivering: number
  pending: number
  confirmed: number
  total: number
  revenue: number
  deliveryFees: number
  orders: TodayOrder[]
}

interface DriverTodayOrdersProps {
  driverId: string
}

export function DriverTodayOrders({ driverId }: DriverTodayOrdersProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<TodayOrdersStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTodayOrders()
  }, [driverId])

  const loadTodayOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/delivery-persons/${driverId}/today-orders`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des commandes")
      }
      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      console.error("Error loading today orders:", err)
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <Badge className="bg-green-100 text-green-700">Livrée</Badge>
      case "DELIVERING":
        return <Badge className="bg-blue-100 text-blue-700">En cours</Badge>
      case "CONFIRMED":
        return <Badge className="bg-amber-100 text-amber-700">Acceptée</Badge>
      case "PENDING":
        return <Badge className="bg-gray-100 text-gray-700">En attente</Badge>
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-700">Annulée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques du jour */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br py-0 from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-200 rounded-lg">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-amber-600">Acceptées</p>
                <p className="text-2xl font-bold text-amber-700">{stats.confirmed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br py-0 from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-green-600">Livrées</p>
                <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-purple-600">Commission</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(stats.deliveryFees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des commandes du jour */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Commandes du jour ({stats.orders?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.orders && stats.orders.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Heure</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-xs text-gray-500">{order.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatTime(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">
                          +{formatCurrency(order.deliveryFee)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune commande aujourd'hui</p>
            </div>
          )}
        </CardContent>
      </Card>

   

    </div>
  )
}
