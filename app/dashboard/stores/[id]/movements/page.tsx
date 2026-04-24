"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Truck,
  Activity,
  Users,
  Loader2,
  ChevronDown,
  RotateCcw,
  Warehouse,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Calendar,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "@/lib/app-toast"
import { ReturnMovementDialog } from "@/components/stores/return-movement-dialog"
import { DriverReturnDialog } from "@/components/stores/driver-return-dialog"
import { StoreReturnWarehouseDialog } from "@/components/stores/store-return-warehouse-dialog"

function toISODateLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

interface MovementsPageProps {
  params: Promise<{
    id: string
  }>
}

interface StockMovement {
  id: string
  type: string
  quantity: number
  note: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string | null
  }
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface DeliveryMovement {
  id: string
  type: "SUPPLY" | "SALE" | "RETURN" | "ADJUSTMENT"
  quantity: number
  notes: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string | null
  }
  deliveryPerson: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string | null
    email: string
  } | null
}

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
  const [storeId, setStoreId] = useState<string>("")
  const [activeTab, setActiveTab] = useState("store")
  const [storeMovements, setStoreMovements] = useState<StockMovement[]>([])
  const [deliveryMovements, setDeliveryMovements] = useState<DeliveryMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [showDriverReturnDialog, setShowDriverReturnDialog] = useState(false)
  const [showWarehouseReturnDialog, setShowWarehouseReturnDialog] = useState(false)

  // Retours livreur en attente de validation
  const [driverReturnRequests, setDriverReturnRequests] = useState<any[]>([])
  const [driverReturnLoading, setDriverReturnLoading] = useState(false)
  const [driverReturnStatusFilter, setDriverReturnStatusFilter] = useState("PENDING")
  const [expandedDriverReturnId, setExpandedDriverReturnId] = useState<string | null>(null)
  const [rejectingDriverReturnId, setRejectingDriverReturnId] = useState<string | null>(null)
  const [driverRejectionReason, setDriverRejectionReason] = useState("")
  const [validatingDriverReturnId, setValidatingDriverReturnId] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState(() => {
    const end = new Date()
    const start = new Date(end.getFullYear(), end.getMonth(), 1)
    return toISODateLocal(start)
  })
  const [dateTo, setDateTo] = useState(() => toISODateLocal(new Date()))

  useEffect(() => {
    params.then((p) => setStoreId(p.id))
  }, [params])

  const loadMovementsForPeriod = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: "500" })
      if (dateFrom) qs.set("from", dateFrom)
      if (dateTo) qs.set("to", dateTo)
      const qsStr = qs.toString()
      const [resStore, resDelivery] = await Promise.all([
        fetch(`/api/stores/${id}/stock/movements?${qsStr}`),
        fetch(`/api/stores/${id}/delivery-movements?${qsStr}`),
      ])
      if (resStore.ok) {
        const data = await resStore.json()
        setStoreMovements(data.movements || [])
      } else {
        toast.error("Erreur lors du chargement des mouvements magasin")
      }
      if (resDelivery.ok) {
        const data = await resDelivery.json()
        setDeliveryMovements(data.movements || [])
      } else {
        toast.error("Erreur lors du chargement des mouvements livreurs")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    if (!storeId) return
    loadMovementsForPeriod(storeId)
  }, [storeId, loadMovementsForPeriod])

  useEffect(() => {
    if (!storeId || activeTab !== "driver-returns") return
    loadDriverReturnRequests(storeId)
  }, [activeTab, storeId, driverReturnStatusFilter])

  const loadDriverReturnRequests = async (id: string) => {
    setDriverReturnLoading(true)
    try {
      const res = await fetch(`/api/stores/${id}/driver-return-requests?status=${driverReturnStatusFilter}`)
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setDriverReturnRequests(data.data || [])
    } catch {
      toast.error("Erreur lors du chargement des retours livreur")
    } finally {
      setDriverReturnLoading(false)
    }
  }

  const handleValidateDriverReturn = async (reqId: string, action: "approve" | "reject") => {
    if (!storeId) return
    setValidatingDriverReturnId(reqId)
    try {
      const res = await fetch(`/api/stores/${storeId}/driver-return-requests/${reqId}/validate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? driverRejectionReason : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erreur")
        return
      }
      toast.success(json.message)
      setRejectingDriverReturnId(null)
      setDriverRejectionReason("")
      setExpandedDriverReturnId(null)
      loadDriverReturnRequests(storeId)
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setValidatingDriverReturnId(null)
    }
  }
  
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

  const filteredStoreMovements = storeMovements.filter(m => {
    const matchesSearch = m.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (m.product.sku && m.product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFilter = filterType === "all" || m.type === filterType
    return matchesSearch && matchesFilter
  })
  
  const filteredDeliveryMovements = deliveryMovements.filter(m => {
    const matchesSearch = m.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.deliveryPerson.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || m.type === filterType
    return matchesSearch && matchesFilter
  })
  
  const entriesCount = storeMovements.filter(m => m.type === "ENTRY").length
  const exitsCount = storeMovements.filter(m => m.type === "EXIT").length
  const adjustmentsCount = storeMovements.filter(m => m.type === "ADJUSTMENT").length
  const deliveryCount = deliveryMovements.length

  return (
    <>
      <div className="flex items-center justify-between p-8 pb-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mouvements de stock</h1>
          <p className="text-gray-600 mt-1">Suivi des entrées et sorties</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Enregistrer un retour
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowReturnDialog(true)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retour client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDriverReturnDialog(true)}>
              <Truck className="h-4 w-4 mr-2" />
              Retour livreur
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowWarehouseReturnDialog(true)}>
              <Warehouse className="h-4 w-4 mr-2" />
              Retour entrepôt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-8 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            Période
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
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Mouvements</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{storeMovements.length + deliveryMovements.length}</div>
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Mvts Livreurs</CardTitle>
            <Truck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{deliveryCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des mouvements avec onglets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Historique des mouvements</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="ENTRY">Entrées</SelectItem>
                  <SelectItem value="EXIT">Sorties</SelectItem>
                  <SelectItem value="SUPPLY">Approvisionnement</SelectItem>
                  <SelectItem value="RETURN">Retour</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="store">
                <Package className="h-4 w-4 mr-2" />
                Stock Magasin ({storeMovements.length})
              </TabsTrigger>
              <TabsTrigger value="delivery">
                <Truck className="h-4 w-4 mr-2" />
                Stock Livreurs ({deliveryMovements.length})
              </TabsTrigger>
              <TabsTrigger value="driver-returns" className="relative">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retours livreurs
                {driverReturnRequests.filter(r => r.status === "PENDING").length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {driverReturnRequests.filter(r => r.status === "PENDING").length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="store" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredStoreMovements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Aucun mouvement trouvé
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStoreMovements.map((movement) => {
                      const isPositive = movement.type === "ENTRY" || movement.type === "RETURN"
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <Badge className={
                              movement.type === "ENTRY" ? "bg-green-100 text-green-700" :
                              movement.type === "EXIT" ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            }>
                              {movement.type === "ENTRY" ? "Entrée" :
                               movement.type === "EXIT" ? "Sortie" :
                               movement.type === "SALE" ? "Vente" :
                               movement.type === "RETURN" ? "Retour" : "Ajustement"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{movement.product.name}</div>
                              {movement.product.sku && (
                                <div className="text-sm text-gray-500">{movement.product.sku}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={isPositive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                              {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {movement.user.name || movement.user.email}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                            {movement.note || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {format(new Date(movement.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="delivery" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredDeliveryMovements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Aucun mouvement livreur trouvé
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Livreur</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Par</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveryMovements.map((movement) => {
                      const isPositive = movement.type === "SUPPLY" || movement.type === "RETURN"
                      const typeColors = {
                        SUPPLY: "bg-green-100 text-green-700",
                        SALE: "bg-blue-100 text-blue-700",
                        RETURN: "bg-amber-100 text-amber-700",
                        ADJUSTMENT: "bg-purple-100 text-purple-700",
                      }
                      const typeLabels = {
                        SUPPLY: "Approvisionnement",
                        SALE: "Vente",
                        RETURN: "Retour",
                        ADJUSTMENT: "Ajustement",
                      }
                      
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <Badge className={typeColors[movement.type]}>
                              {typeLabels[movement.type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{movement.product.name}</div>
                              {movement.product.sku && (
                                <div className="text-sm text-gray-500">{movement.product.sku}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{movement.deliveryPerson.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={isPositive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                              {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                            {movement.notes || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {movement.createdBy ? (movement.createdBy.name || movement.createdBy.email) : "Système"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {format(new Date(movement.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* ── Onglet : Retours livreurs ── */}
            <TabsContent value="driver-returns" className="mt-4 space-y-4">
              {/* Filtres statut */}
              <div className="flex gap-2">
                {[
                  { value: "PENDING", label: "En attente" },
                  { value: "APPROVED", label: "Approuvés" },
                  { value: "REJECTED", label: "Rejetés" },
                  { value: "all", label: "Tous" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={driverReturnStatusFilter === opt.value ? "default" : "outline"}
                    onClick={() => setDriverReturnStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {driverReturnLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
                </div>
              ) : driverReturnRequests.length === 0 ? (
                <div className="text-center py-16">
                  <RotateCcw className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">
                    {driverReturnStatusFilter === "PENDING"
                      ? "Aucun retour en attente de validation"
                      : "Aucune demande trouvée"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {driverReturnRequests.map((req: any) => {
                    const isExpanded = expandedDriverReturnId === req.id
                    const isRejecting = rejectingDriverReturnId === req.id
                    const isValidating = validatingDriverReturnId === req.id

                    return (
                      <div
                        key={req.id}
                        className={cn(
                          "border rounded-xl p-4 bg-white transition-shadow",
                          isExpanded && "shadow-md ring-1 ring-blue-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar livreur */}
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-semibold text-blue-700 text-sm">
                            {req.deliveryPerson?.name?.[0]?.toUpperCase() || "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-gray-900">
                                {req.deliveryPerson?.name}
                              </span>
                              <span
                                className={cn(
                                  "text-[11px] font-medium px-2 py-0.5 rounded-full",
                                  req.status === "PENDING" && "bg-amber-100 text-amber-700",
                                  req.status === "APPROVED" && "bg-green-100 text-green-700",
                                  req.status === "REJECTED" && "bg-red-100 text-red-700",
                                )}
                              >
                                {req.status === "PENDING" && "En attente"}
                                {req.status === "APPROVED" && "Approuvé"}
                                {req.status === "REJECTED" && "Rejeté"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <strong>{req.product?.name}</strong>
                              {req.product?.sku && ` · ${req.product.sku}`}
                              {" · "}
                              <strong>{req.requestedQuantity} unité{req.requestedQuantity > 1 ? "s" : ""}</strong>
                              {" · "}
                              {new Date(req.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            {req.notes && (
                              <p className="text-xs text-gray-400 mt-0.5 italic">{req.notes}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {req.status === "PENDING" && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white h-8"
                                  disabled={isValidating}
                                  onClick={() => handleValidateDriverReturn(req.id, "approve")}
                                >
                                  {isValidating ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}
                                  Approuver
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 h-8"
                                  disabled={isValidating}
                                  onClick={() => {
                                    setRejectingDriverReturnId(isRejecting ? null : req.id)
                                    setDriverRejectionReason("")
                                  }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => setExpandedDriverReturnId(isExpanded ? null : req.id)}
                            >
                              <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                            </Button>
                          </div>
                        </div>

                        {/* Zone rejet */}
                        {isRejecting && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                            <p className="text-xs font-medium text-red-700">Motif du rejet (optionnel)</p>
                            <Textarea
                              placeholder="Précisez la raison..."
                              value={driverRejectionReason}
                              onChange={(e) => setDriverRejectionReason(e.target.value)}
                              rows={2}
                              className="bg-white text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={isValidating}
                                onClick={() => handleValidateDriverReturn(req.id, "reject")}
                              >
                                {isValidating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                Confirmer le rejet
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectingDriverReturnId(null)}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Détails */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>Livreur :</span>
                              <span className="font-medium">{req.deliveryPerson?.name} — {req.deliveryPerson?.phone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Produit :</span>
                              <span className="font-medium">{req.product?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Quantité demandée :</span>
                              <span className="font-medium">{req.requestedQuantity}</span>
                            </div>
                            {req.approvedQuantity && (
                              <div className="flex justify-between">
                                <span>Quantité approuvée :</span>
                                <span className="font-medium text-green-700">{req.approvedQuantity}</span>
                              </div>
                            )}
                            {req.approvedBy && (
                              <div className="flex justify-between">
                                <span>{req.status === "APPROVED" ? "Approuvé" : "Rejeté"} par :</span>
                                <span className="font-medium">
                                  {[req.approvedBy.firstName, req.approvedBy.lastName].filter(Boolean).join(" ") || req.approvedBy.email}
                                  {" le "}
                                  {new Date(req.approvedAt).toLocaleDateString("fr-FR")}
                                </span>
                              </div>
                            )}
                            {req.rejectionReason && (
                              <div className="flex justify-between text-red-600">
                                <span>Motif du rejet :</span>
                                <span className="font-medium max-w-[60%] text-right">{req.rejectionReason}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
      </div>

      {/* Modal de retour client */}
      <ReturnMovementDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        storeId={storeId}
        onSuccess={() => loadMovementsForPeriod(storeId)}
      />

      {/* Modal de retour livreur */}
      <DriverReturnDialog
        open={showDriverReturnDialog}
        onOpenChange={setShowDriverReturnDialog}
        storeId={storeId}
        onSuccess={() => loadMovementsForPeriod(storeId)}
      />

      {/* Modal de retour entrepôt */}
      <StoreReturnWarehouseDialog
        open={showWarehouseReturnDialog}
        onOpenChange={setShowWarehouseReturnDialog}
        storeId={storeId}
        onSuccess={() => loadMovementsForPeriod(storeId)}
      />
    </>
  )
}
