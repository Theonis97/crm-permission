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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ShoppingBag,
  Search,
  Loader2,
  Package,
  Users,
  DollarSign,
  Receipt,
  Calendar,
  RefreshCw,
  Truck,
  ArrowDownCircle,
  Store,
  Trophy,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
import { formatFCFA } from "@/lib/utils"
import { StorePageHeader } from "@/components/stores/store-page-header"

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  deliveryFee: number
  deliveryType: string
  netUnitPrice: number
  netTotalPrice: number
  /** Palier sur le total ligne (qté × PU) */
  commission?: number
  product: { id: string; name: string; sku: string | null; photos: string[] }
  variant?: { id: string; name: string; sku: string | null } | null
}

interface DriverSale {
  id: string
  totalAmount: number
  totalDeliveryFees: number
  netTotalAmount: number
  totalCommission?: number
  amountToDeposit?: number
  declaredAt: string
  notes?: string | null
  deliveryPerson: { id: string; name: string; email: string; avatar?: string | null }
  store: { id: string; name: string }
  items: SaleItem[]
}

interface DriverAgg {
  driverId: string
  driverName: string
  total: number
  netTotal: number
  depositTotal?: number
  totalDeliveryFees: number
  commissionTotal?: number
  count: number
  rank?: number
}

interface Summary {
  byDriver: DriverAgg[]
  grandTotal: number
  grandNetTotal: number
  grandDeliveryFees: number
  grandCommission?: number
  grandAmountToDeposit?: number
  totalSales: number
  topPerformer: (DriverAgg & { rank: number }) | null
  rankingByNet: Array<DriverAgg & { rank: number }>
  rankingByDeclarations: Array<DriverAgg & { rank: number }>
}

function toISODateLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function DriverSalesPage() {
  const params = useParams()
  const storeId = params.id as string

  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)

  const [sales, setSales] = useState<DriverSale[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [period, setPeriod] = useState<{ from: string | null; to: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [driverFilter, setDriverFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState(() => toISODateLocal(defaultFrom))
  const [dateTo, setDateTo] = useState(() => toISODateLocal(today))
  const [allStores, setAllStores] = useState(false)

  const loadSales = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (dateFrom) qs.set("from", dateFrom)
      if (dateTo) qs.set("to", dateTo)
      if (allStores) qs.set("allStores", "1")
      if (allStores && storeFilter !== "all") qs.set("storeId", storeFilter)
      if (driverFilter !== "all") qs.set("driverId", driverFilter)

      const res = await fetch(`/api/stores/${storeId}/driver-sales?${qs.toString()}`)
      if (!res.ok) {
        toast.error("Erreur lors du chargement des ventes livreurs")
        return
      }
      const data = await res.json()
      setSales(data.sales || [])
      setSummary(data.summary || null)
      setPeriod(data.period ?? null)
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }, [storeId, dateFrom, dateTo, allStores, storeFilter, driverFilter])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  const applyPreset = (preset: "today" | "7d" | "30d" | "month" | "lastMonth") => {
    const end = new Date()
    let start = new Date()
    if (preset === "today") {
      start = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    } else if (preset === "7d") {
      start = new Date(end)
      start.setDate(start.getDate() - 6)
    } else if (preset === "30d") {
      start = new Date(end)
      start.setDate(start.getDate() - 29)
    } else if (preset === "month") {
      start = new Date(end.getFullYear(), end.getMonth(), 1)
    } else if (preset === "lastMonth") {
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
      const lastDayPrev = new Date(end.getFullYear(), end.getMonth(), 0)
      setDateFrom(toISODateLocal(start))
      setDateTo(toISODateLocal(lastDayPrev))
      return
    }
    setDateFrom(toISODateLocal(start))
    setDateTo(toISODateLocal(end))
  }

  const drivers = summary?.byDriver ?? []
  const ranking = summary?.rankingByNet ?? []
  const driverOptions = ranking.length > 0 ? ranking : drivers

  // Liste unique de magasins extraite des ventes
  const storeList = Array.from(
    new Map(sales.map((s) => [s.store.id, s.store])).values()
  )

  const filteredSales = sales.filter((s) => {
    const matchSearch =
      searchTerm === "" ||
      s.deliveryPerson.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.items.some((i) => i.product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchSearch
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
        description="Filtrez par période, consultez les totaux et le classement des livreurs (performance sur le net magasin)."
        icon={ShoppingBag}
      />

      <div className="p-6 space-y-6">
        {/* Filtres période & périmètre */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              Période et périmètre
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Du</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Au</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("today")}>
                  Aujourd&apos;hui
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("7d")}>
                  7 jours
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("30d")}>
                  30 jours
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("month")}>
                  Ce mois
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("lastMonth")}>
                  Mois dernier
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-stores"
                checked={allStores}
                onCheckedChange={(v) => {
                  setAllStores(v === true)
                  if (v !== true) setStoreFilter("all")
                }}
              />
              <Label htmlFor="all-stores" className="text-sm font-normal cursor-pointer">
                Inclure tous les magasins du réseau (sinon : magasin du tableau de bord uniquement)
              </Label>
            </div>
            {(period?.from || period?.to) && (
              <p className="text-xs text-muted-foreground">
                Période appliquée côté serveur :{" "}
                <strong>
                  {period.from ?? "…"} → {period.to ?? "…"}
                </strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Livreur le plus performant (sur la période) */}
        {summary?.topPerformer && (
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                <Trophy className="h-5 w-5 text-amber-600" />
                Livreur le plus performant (période sélectionnée)
              </CardTitle>
              <p className="text-xs text-amber-800/80">
                Classement par montant net à reverser au magasin, puis chiffre encaissé, puis nombre de
                déclarations.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white/70 px-4 py-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">{summary.topPerformer.driverName}</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.topPerformer.count} déclaration
                    {summary.topPerformer.count > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-6 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">À recevoir (après comm.)</p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatFCFA(summary.topPerformer.depositTotal ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Net produit</p>
                    <p className="text-lg font-bold text-blue-700">{formatFCFA(summary.topPerformer.netTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Encaissé</p>
                    <p className="text-xl font-bold text-green-700">{formatFCFA(summary.topPerformer.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Commission</p>
                    <p className="text-xl font-bold text-amber-900">
                      {formatFCFA(summary.topPerformer.commissionTotal ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Classement complet */}
        {ranking.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Classement des livreurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Livreur</TableHead>
                    <TableHead className="text-right">Déclarations</TableHead>
                    <TableHead className="text-right">Encaissé</TableHead>
                    <TableHead className="text-right">Frais livr.</TableHead>
                    <TableHead className="text-right">Net produit</TableHead>
                    <TableHead className="text-right text-amber-800">Commission</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800">À recevoir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((row) => (
                    <TableRow key={row.driverId}>
                      <TableCell className="font-semibold text-muted-foreground">{row.rank}</TableCell>
                      <TableCell className="font-medium">{row.driverName}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right text-green-700">{formatFCFA(row.total)}</TableCell>
                      <TableCell className="text-right text-orange-600">
                        {row.totalDeliveryFees > 0 ? formatFCFA(row.totalDeliveryFees) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">
                        {formatFCFA(row.netTotal)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-900">
                        {formatFCFA(row.commissionTotal ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-900">
                        {formatFCFA(row.depositTotal ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Statistiques */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total encaissé</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatFCFA(summary.grandTotal)}</p>
                <p className="text-xs text-gray-500 mt-1">Sur la période filtrée</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">À recevoir des livreurs</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-800">{formatFCFA(summary.grandAmountToDeposit ?? 0)}</p>
                <p className="text-xs text-blue-700/90 mt-1">
                  Net produit déclaré : {formatFCFA(summary.grandNetTotal)} (qté × prix net) − commission livreur
                </p>
                {summary.grandDeliveryFees > 0 && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Livraison (info) : {formatFCFA(summary.grandDeliveryFees)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-900">Commission livreurs</CardTitle>
                <Wallet className="h-4 w-4 text-amber-700" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-900">{formatFCFA(summary.grandCommission ?? 0)}</p>
                <p className="text-xs text-amber-800/90 mt-1">Paliers sur total par ligne produit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Déclarations</CardTitle>
                <Receipt className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.totalSales}</p>
                <p className="text-xs text-gray-500 mt-1">Sur la période</p>
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
          </div>
        )}

        {/* Par livreur */}
        {ranking.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Récapitulatif par livreur (ordre performance)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {ranking.map((d) => (
                  <div
                    key={d.driverId}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {d.rank === 1 && <Trophy className="h-4 w-4 text-amber-500 shrink-0" />}
                          <p className="font-semibold text-sm text-gray-900">{d.driverName}</p>
                          <Badge variant="outline" className="text-[10px]">
                            #{d.rank}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{d.count} déclaration{d.count > 1 ? "s" : ""}</p>
                      </div>
                      <span className="text-sm font-bold text-green-600">{formatFCFA(d.total)}</span>
                    </div>
                    {d.totalDeliveryFees > 0 && (
                      <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Truck className="h-3 w-3 text-orange-500" />
                          Livraison retenue
                        </span>
                        <span className="text-xs font-semibold text-orange-600">− {formatFCFA(d.totalDeliveryFees)}</span>
                      </div>
                    )}
                    {d.totalDeliveryFees > 0 && (
                      <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-semibold text-blue-800">Net produit (qté × prix net)</span>
                        <span className="text-sm font-bold text-blue-700">{formatFCFA(d.netTotal)}</span>
                      </div>
                    )}
                    {d.totalDeliveryFees === 0 && (
                      <div className="flex items-center justify-between bg-blue-50/60 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-semibold text-blue-800">Net produit</span>
                        <span className="text-sm font-bold text-blue-700">{formatFCFA(d.netTotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-amber-200/60 pt-2">
                      <span className="text-xs font-medium text-amber-900">Commission (paliers)</span>
                      <span className="text-sm font-bold text-amber-900">{formatFCFA(d.commissionTotal ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-900">À recevoir du livreur</span>
                      <span className="text-sm font-bold text-emerald-800">{formatFCFA(d.depositTotal ?? 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Total global */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                  <span className="font-bold text-green-800">Total encaissé (tous livreurs)</span>
                  <span className="text-lg font-bold text-green-600">{formatFCFA(summary?.grandTotal ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                  <span className="font-bold text-blue-800 flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    Net produit déclaré (tous livreurs)
                  </span>
                  <span className="text-lg font-bold text-blue-700">{formatFCFA(summary?.grandNetTotal ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <span className="font-bold text-emerald-900">À recevoir des livreurs (après commission)</span>
                  <span className="text-lg font-bold text-emerald-800">
                    {formatFCFA(summary?.grandAmountToDeposit ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <span className="font-bold text-amber-900">Commission livreurs (paliers)</span>
                  <span className="text-lg font-bold text-amber-900">
                    {formatFCFA(summary?.grandCommission ?? 0)}
                  </span>
                </div>
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
          <Select
            value={storeFilter}
            onValueChange={setStoreFilter}
            disabled={!allStores}
          >
            <SelectTrigger className="w-48">
              <Store className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder={allStores ? "Tous les magasins" : "Magasin actuel"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les magasins</SelectItem>
              {storeList.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les livreurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les livreurs</SelectItem>
              {driverOptions.map((d) => (
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
            {filteredSales.map((sale) => {
              const hasDelivery = (sale.totalDeliveryFees ?? 0) > 0
              return (
                <Card key={sale.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    {/* En-tête : livreur + date + montants */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={sale.deliveryPerson.avatar ?? undefined} />
                          <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-sm">
                            {sale.deliveryPerson.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{sale.deliveryPerson.name}</p>
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Store className="h-3 w-3" />
                              {sale.store.name}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {formatDate(sale.declaredAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1">
                          Encaissé : {formatFCFA(sale.totalAmount)}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-3 py-1">
                          Net produit : {formatFCFA(sale.netTotalAmount)}
                        </Badge>
                        {hasDelivery && (
                          <span className="text-xs text-orange-600 flex items-center justify-end gap-1">
                            <Truck className="h-3 w-3" />
                            Livraison : − {formatFCFA(sale.totalDeliveryFees)}
                          </span>
                        )}
                        {typeof sale.amountToDeposit === "number" && (
                          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs px-3 py-1">
                            À recevoir : {formatFCFA(sale.amountToDeposit)}
                          </Badge>
                        )}
                        {typeof sale.totalCommission === "number" && (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs px-3 py-1">
                            Commission livreur : {formatFCFA(sale.totalCommission)}
                          </Badge>
                        )}
                      </div>
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
                              <img src={item.product.photos[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-neutral-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                            {item.variant && <p className="text-xs text-gray-500">{item.variant.name}</p>}
                            {item.deliveryType !== "none" && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                item.deliveryType === "free"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {item.deliveryType === "free" ? "Livraison offerte" : "Livraison payante"} · {formatFCFA(item.deliveryFee)}/u
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-700">
                              {item.quantity} × {formatFCFA(item.unitPrice)}
                            </p>
                            <p className="text-xs font-bold text-green-600">Net magasin : {formatFCFA(item.netTotalPrice)}</p>
                            {item.deliveryType !== "none" && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Livraison {item.deliveryType === "free" ? "offerte" : "payante"} · {formatFCFA(item.deliveryFee)}/u
                                {item.deliveryType === "free" ? " (à votre charge, hors net magasin)" : ""}
                              </p>
                            )}
                            {item.commission != null && (
                              <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                                Commission ligne : {formatFCFA(item.commission)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Note */}
                    {sale.notes && (
                      <p className="text-xs text-gray-500 italic border-t border-neutral-100 pt-3">
                        « {sale.notes} »
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
