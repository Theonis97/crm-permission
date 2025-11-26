"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"
import { ReturnMovementDialog } from "@/components/stores/return-movement-dialog"
import { DriverReturnDialog } from "@/components/stores/driver-return-dialog"

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
  
  useEffect(() => {
    params.then(p => {
      setStoreId(p.id)
      fetchStoreMovements(p.id)
    })
  }, [])
  
  useEffect(() => {
    if (storeId && activeTab === "delivery") {
      fetchDeliveryMovements(storeId)
    }
  }, [activeTab, storeId])
  
  const fetchStoreMovements = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${id}/stock/movements?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setStoreMovements(data.movements || [])
      }
    } catch (error) {
      console.error("Error fetching store movements:", error)
      toast.error("Erreur lors du chargement des mouvements")
    } finally {
      setLoading(false)
    }
  }
  
  const fetchDeliveryMovements = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${id}/delivery-movements?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setDeliveryMovements(data.movements || [])
      }
    } catch (error) {
      console.error("Error fetching delivery movements:", error)
      toast.error("Erreur lors du chargement des mouvements livreurs")
    } finally {
      setLoading(false)
    }
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-8 space-y-6">

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
          </Tabs>
        </CardHeader>
      </Card>
      </div>

      {/* Modal de retour client */}
      <ReturnMovementDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        storeId={storeId}
        onSuccess={() => {
          fetchStoreMovements(storeId)
          if (activeTab === "delivery") {
            fetchDeliveryMovements(storeId)
          }
        }}
      />

      {/* Modal de retour livreur */}
      <DriverReturnDialog
        open={showDriverReturnDialog}
        onOpenChange={setShowDriverReturnDialog}
        storeId={storeId}
        onSuccess={() => {
          fetchStoreMovements(storeId)
          fetchDeliveryMovements(storeId)
        }}
      />
    </>
  )
}
