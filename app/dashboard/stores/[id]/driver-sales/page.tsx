"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ShoppingBag,
  Search,
  Loader2,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Receipt,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { formatFCFA } from "@/lib/utils"
import { StorePageHeader } from "@/components/stores/store-page-header"

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product: { id: string; name: string; sku: string | null; photos: string[] }
  variant?: { id: string; name: string; sku: string | null } | null
}

interface DriverSale {
  id: string
  totalAmount: number
  declaredAt: string
  notes?: string | null
  deliveryPerson: { id: string; name: string; email: string; avatar?: string | null }
  store: { id: string; name: string }
  items: SaleItem[]
}

interface Summary {
  byDriver: Array<{ driverId: string; driverName: string; total: number; count: number }>
  grandTotal: number
  totalSales: number
}

export default function DriverSalesPage() {
  const params = useParams()
  const storeId = params.id as string

  const [sales, setSales] = useState<DriverSale[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [driverFilter, setDriverFilter] = useState("all")

  const loadSales = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stores/${storeId}/driver-sales`)
      if (!res.ok) {
        toast.error("Erreur lors du chargement des ventes livreurs")
        return
      }
      const data = await res.json()
      setSales(data.sales || [])
      setSummary(data.summary || null)
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  // Liste unique de livreurs pour le filtre
  const drivers = summary?.byDriver ?? []

  const filteredSales = sales.filter((s) => {
    const matchDriver = driverFilter === "all" || s.deliveryPerson.id === driverFilter
    const matchSearch =
      searchTerm === "" ||
      s.deliveryPerson.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.items.some((i) => i.product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchDriver && matchSearch
  })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <>
      <StorePageHeader
        title="Ventes livreurs"
        description="Déclarations de ventes effectuées par les livreurs"
        icon={ShoppingBag}
      />

      <div className="p-6 space-y-6">
        {/* Statistiques */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total encaissé</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatFCFA(summary.grandTotal)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Toutes déclarations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Déclarations</CardTitle>
                <Receipt className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.totalSales}</p>
                <p className="text-xs text-gray-500 mt-1">Au total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Livreurs actifs</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{drivers.length}</p>
                <p className="text-xs text-gray-500 mt-1">Ayant déclaré des ventes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Moy. par déclaration</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.totalSales > 0
                    ? formatFCFA(summary.grandTotal / summary.totalSales)
                    : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Montant moyen</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Par livreur */}
        {drivers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Récapitulatif par livreur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {drivers.map((d) => (
                  <div
                    key={d.driverId}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{d.driverName}</p>
                      <p className="text-xs text-gray-500">{d.count} déclaration{d.count > 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">{formatFCFA(d.total)}</span>
                  </div>
                ))}
              </div>
              {/* Total global */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                <span className="font-bold text-green-800">Total tous livreurs</span>
                <span className="text-lg font-bold text-green-600">
                  {formatFCFA(summary?.grandTotal ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par livreur ou produit…"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les livreurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les livreurs</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.driverId} value={d.driverId}>
                  {d.driverName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadSales} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Liste des déclarations */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucune vente déclarée</p>
            <p className="text-gray-400 text-sm mt-1">
              Les livreurs doivent déclarer leurs ventes depuis leur portail mobile
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSales.map((sale) => (
              <Card key={sale.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* En-tête : livreur + date + montant */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={sale.deliveryPerson.avatar ?? undefined} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-sm">
                          {sale.deliveryPerson.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{sale.deliveryPerson.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(sale.declaredAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1">
                      {formatFCFA(sale.totalAmount)}
                    </Badge>
                  </div>

                  {/* Produits */}
                  <div className="space-y-2">
                    {sale.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2"
                      >
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                          {item.product.photos?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.photos[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.product.name}
                          </p>
                          {item.variant && (
                            <p className="text-xs text-gray-500">{item.variant.name}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-700">
                            {item.quantity} × {formatFCFA(item.unitPrice)}
                          </p>
                          <p className="text-xs font-bold text-green-600">
                            = {formatFCFA(item.totalPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {sale.notes && (
                    <p className="mt-3 text-xs text-gray-500 italic border-t border-neutral-100 pt-3">
                      « {sale.notes} »
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
