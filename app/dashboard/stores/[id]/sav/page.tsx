"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RotateCcw,
  Search,
  Plus,
  Package,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Clock,
  ArrowLeftRight,
  Banknote,
  User,
  Phone,
  ShoppingBag,
  ChevronRight,
  ArrowLeft,
  Minus,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

interface SAVPageProps {
  params: Promise<{
    id: string
  }>
}

interface ProductReturn {
  id: string
  number: string
  customerName: string
  customerPhone: string
  status: "PENDING" | "APPROVED" | "REFUNDED" | "EXCHANGED" | "REJECTED"
  totalRefundAmount: number
  notes: string | null
  createdAt: string
  processedAt: string | null
  storeOrder: {
    id: string
    number: string
  }
  items: ProductReturnItem[]
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  processedBy: {
    id: string
    name: string | null
    email: string
  } | null
}

interface ProductReturnItem {
  id: string
  productName: string
  productSku: string | null
  quantity: number
  unitPrice: number
  refundAmount: number
  reason: "DEFECTIVE" | "BROKEN" | "NOT_SATISFIED" | "NON_FUNCTIONAL" | "WRONG_PRODUCT" | "OTHER"
  reasonDetails: string | null
  isRefunded: boolean
  product: {
    id: string
    name: string
  }
}

// Interfaces pour la création de retour
interface CustomerOrder {
  id: string
  number: string
  customerName: string
  customerPhone: string
  total: number
  status: string
  createdAt: string
  items: CustomerOrderItem[]
}

interface CustomerOrderItem {
  id: string
  productId: string
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  total: number
}

interface ReturnItemSelection {
  storeOrderItemId: string
  productId: string
  productName: string
  productSku: string | null
  maxQuantity: number
  unitPrice: number
  quantity: number
  reason: "DEFECTIVE" | "BROKEN" | "NOT_SATISFIED" | "NON_FUNCTIONAL" | "WRONG_PRODUCT" | "OTHER"
  reasonDetails: string
  isRefunded: boolean
  selected: boolean
}

type ReturnReason = "DEFECTIVE" | "BROKEN" | "NOT_SATISFIED" | "NON_FUNCTIONAL" | "WRONG_PRODUCT" | "OTHER"

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "DEFECTIVE", label: "Défectueux" },
  { value: "BROKEN", label: "Cassé" },
  { value: "NOT_SATISFIED", label: "Pas satisfait" },
  { value: "NON_FUNCTIONAL", label: "Non fonctionnel" },
  { value: "WRONG_PRODUCT", label: "Mauvais produit" },
  { value: "OTHER", label: "Autre" },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
    case "APPROVED":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>
    case "REFUNDED":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Banknote className="h-3 w-3 mr-1" />Remboursé</Badge>
    case "EXCHANGED":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><ArrowLeftRight className="h-3 w-3 mr-1" />Échangé</Badge>
    case "REJECTED":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getReasonLabel = (reason: string) => {
  switch (reason) {
    case "DEFECTIVE":
      return "Défectueux"
    case "BROKEN":
      return "Cassé"
    case "NOT_SATISFIED":
      return "Pas satisfait"
    case "NON_FUNCTIONAL":
      return "Non fonctionnel"
    case "WRONG_PRODUCT":
      return "Mauvais produit"
    case "OTHER":
      return "Autre"
    default:
      return reason
  }
}

const getReasonBadge = (reason: string) => {
  switch (reason) {
    case "DEFECTIVE":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Défectueux</Badge>
    case "BROKEN":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cassé</Badge>
    case "NOT_SATISFIED":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pas satisfait</Badge>
    case "NON_FUNCTIONAL":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Non fonctionnel</Badge>
    case "WRONG_PRODUCT":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Mauvais produit</Badge>
    case "OTHER":
      return <Badge variant="outline">Autre</Badge>
    default:
      return <Badge variant="outline">{reason}</Badge>
  }
}

export default function SAVPage({ params }: SAVPageProps) {
  const resolvedParams = use(params)
  const storeId = resolvedParams.id
  const { data: session } = useSession()

  const [returns, setReturns] = useState<ProductReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // États pour le Sheet de création de retour
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1) // 1: Recherche client, 2: Sélection commande, 3: Sélection produits
  const [customerSearch, setCustomerSearch] = useState("")
  const [searchingOrders, setSearchingOrders] = useState(false)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null)
  const [returnItems, setReturnItems] = useState<ReturnItemSelection[]>([])
  const [returnNotes, setReturnNotes] = useState("")
  const [creatingReturn, setCreatingReturn] = useState(false)

  // Statistiques
  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === "PENDING").length,
    refunded: returns.filter(r => r.status === "REFUNDED").length,
    exchanged: returns.filter(r => r.status === "EXCHANGED").length,
  }

  // Charger les retours
  const loadReturns = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${storeId}/sav`)
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setReturns(data)
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors du chargement des retours")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReturns()
  }, [storeId])

  // Filtrer les retours
  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.customerPhone.includes(searchQuery) ||
      ret.storeOrder.number.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || ret.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Traiter un retour (approuver, rembourser, échanger, rejeter)
  const processReturn = async (returnId: string, action: "APPROVED" | "REFUNDED" | "EXCHANGED" | "REJECTED") => {
    try {
      setProcessingId(returnId)
      const response = await fetch(`/api/stores/${storeId}/sav/${returnId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors du traitement")
      }

      toast.success(
        action === "REFUNDED" ? "Retour remboursé avec succès" :
        action === "EXCHANGED" ? "Échange effectué avec succès" :
        action === "APPROVED" ? "Retour approuvé" :
        "Retour rejeté"
      )
      loadReturns()
    } catch (error: any) {
      console.error("Erreur:", error)
      toast.error(error.message || "Erreur lors du traitement")
    } finally {
      setProcessingId(null)
    }
  }

  // Voir les détails
  const viewDetails = (ret: ProductReturn) => {
    setSelectedReturn(ret)
    setShowDetailsDialog(true)
  }

  // === Fonctions pour la création de retour ===

  // Réinitialiser le formulaire de création
  const resetCreateForm = () => {
    setCreateStep(1)
    setCustomerSearch("")
    setCustomerOrders([])
    setSelectedOrder(null)
    setReturnItems([])
    setReturnNotes("")
  }

  // Ouvrir le Sheet de création
  const openCreateSheet = () => {
    resetCreateForm()
    setShowCreateSheet(true)
  }

  // Fermer le Sheet de création
  const closeCreateSheet = () => {
    setShowCreateSheet(false)
    resetCreateForm()
  }

  // Rechercher les commandes d'un client
  const searchCustomerOrders = async () => {
    if (!customerSearch.trim()) {
      toast.error("Veuillez entrer un numéro de téléphone ou un nom")
      return
    }

    try {
      setSearchingOrders(true)
      // Rechercher toutes les commandes livrées
      const response = await fetch(
        `/api/stores/${storeId}/orders?search=${encodeURIComponent(customerSearch)}&status=DELIVERED`
      )
      if (!response.ok) throw new Error("Erreur lors de la recherche")
      const data = await response.json()
      
      // Mapper les commandes au format attendu
      const ordersWithItems = (data.orders || [])
        .filter((o: any) => o.items && o.items.length > 0)
        .map((o: any) => ({
          id: o.id,
          number: o.number,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          items: o.items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        }))
      
      setCustomerOrders(ordersWithItems)
      
      if (ordersWithItems.length === 0) {
        toast.info("Aucune commande trouvée pour ce client")
      } else {
        setCreateStep(2)
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la recherche des commandes")
    } finally {
      setSearchingOrders(false)
    }
  }

  // Sélectionner une commande
  const selectOrder = (order: CustomerOrder) => {
    setSelectedOrder(order)
    // Initialiser les items de retour
    const items: ReturnItemSelection[] = order.items.map(item => ({
      storeOrderItemId: item.id,
      productId: item.productId,
      productName: item.name,
      productSku: item.sku,
      maxQuantity: item.quantity,
      unitPrice: item.unitPrice,
      quantity: 1,
      reason: "DEFECTIVE" as ReturnReason,
      reasonDetails: "",
      isRefunded: true,
      selected: false,
    }))
    setReturnItems(items)
    setCreateStep(3)
  }

  // Retour à l'étape précédente
  const goBackStep = () => {
    if (createStep === 2) {
      setCreateStep(1)
      setCustomerOrders([])
    } else if (createStep === 3) {
      setCreateStep(2)
      setSelectedOrder(null)
      setReturnItems([])
    }
  }

  // Toggle sélection d'un item
  const toggleItemSelection = (index: number) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ))
  }

  // Mettre à jour la quantité d'un item
  const updateItemQuantity = (index: number, quantity: number) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxQuantity) } : item
    ))
  }

  // Mettre à jour le motif d'un item
  const updateItemReason = (index: number, reason: ReturnReason) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, reason } : item
    ))
  }

  // Mettre à jour les détails du motif
  const updateItemReasonDetails = (index: number, reasonDetails: string) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, reasonDetails } : item
    ))
  }

  // Mettre à jour le type de résolution (remboursement ou échange)
  const updateItemIsRefunded = (index: number, isRefunded: boolean) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isRefunded } : item
    ))
  }

  // Calculer le montant total du retour
  const calculateTotalRefund = () => {
    return returnItems
      .filter(item => item.selected)
      .reduce((total, item) => total + (item.quantity * item.unitPrice), 0)
  }

  // Créer le retour
  const createReturn = async () => {
    const selectedItems = returnItems.filter(item => item.selected)
    
    if (selectedItems.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit à retourner")
      return
    }

    if (!selectedOrder) {
      toast.error("Aucune commande sélectionnée")
      return
    }

    try {
      setCreatingReturn(true)
      const response = await fetch(`/api/stores/${storeId}/sav`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeOrderId: selectedOrder.id,
          items: selectedItems.map(item => ({
            storeOrderItemId: item.storeOrderItemId,
            quantity: item.quantity,
            reason: item.reason,
            reasonDetails: item.reasonDetails || null,
            isRefunded: item.isRefunded,
          })),
          notes: returnNotes || null,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      toast.success("Retour créé avec succès")
      closeCreateSheet()
      loadReturns()
    } catch (error: any) {
      console.error("Erreur:", error)
      toast.error(error.message || "Erreur lors de la création du retour")
    } finally {
      setCreatingReturn(false)
    }
  }

  // Nombre d'items sélectionnés
  const selectedItemsCount = returnItems.filter(item => item.selected).length

  return (
    <div className="flex flex-col">
      <StorePageHeader
        title="Service Après-Vente"
        description="Gérez les retours de produits et les remboursements"
        icon={RotateCcw}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[250px] bg-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="APPROVED">Approuvé</SelectItem>
                <SelectItem value="REFUNDED">Remboursé</SelectItem>
                <SelectItem value="EXCHANGED">Échangé</SelectItem>
                <SelectItem value="REJECTED">Rejeté</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateSheet}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau retour
            </Button>
          </div>
        }
      />

      {/* Contenu principal */}
      <div className="px-10 py-6 flex flex-col gap-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total retours</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remboursés</CardTitle>
              <Banknote className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.refunded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Échangés</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.exchanged}</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des retours */}
        <Card>
          <CardHeader>
            <CardTitle>Retours de produits ({filteredReturns.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReturns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Aucun retour trouvé</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Retour</TableHead>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">{ret.number}</TableCell>
                      <TableCell>
                        <span className="text-blue-600 hover:underline cursor-pointer">
                          {ret.storeOrder.number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ret.customerName}</div>
                          <div className="text-sm text-muted-foreground">{ret.customerPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{ret.items.length} article(s)</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {ret.totalRefundAmount.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell>{getStatusBadge(ret.status)}</TableCell>
                      <TableCell>
                        {format(new Date(ret.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewDetails(ret)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {ret.status === "PENDING" && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => processReturn(ret.id, "APPROVED")}
                                  disabled={processingId === ret.id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => processReturn(ret.id, "REJECTED")}
                                  disabled={processingId === ret.id}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeter
                                </DropdownMenuItem>
                              </>
                            )}
                            {ret.status === "APPROVED" && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => processReturn(ret.id, "REFUNDED")}
                                  disabled={processingId === ret.id}
                                >
                                  <Banknote className="h-4 w-4 mr-2" />
                                  Rembourser
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => processReturn(ret.id, "EXCHANGED")}
                                  disabled={processingId === ret.id}
                                >
                                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                                  Échanger
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de détails */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Détails du retour {selectedReturn?.number}
            </DialogTitle>
            <DialogDescription>
              Commande: {selectedReturn?.storeOrder.number}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedReturn.customerName}</p>
                  <p className="text-sm">{selectedReturn.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de création</p>
                  <p className="font-medium">
                    {format(new Date(selectedReturn.createdAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Montant total</p>
                  <p className="font-medium text-lg">{selectedReturn.totalRefundAmount.toLocaleString()} FCFA</p>
                </div>
              </div>

              {/* Articles retournés */}
              <div>
                <h4 className="font-semibold mb-3">Articles retournés</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead>Résolution</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              {item.productSku && (
                                <div className="text-xs text-muted-foreground">{item.productSku}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {getReasonBadge(item.reason)}
                            {item.reasonDetails && (
                              <p className="text-xs text-muted-foreground mt-1">{item.reasonDetails}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.isRefunded ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">Remboursé</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">Échangé</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.refundAmount.toLocaleString()} FCFA
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes */}
              {selectedReturn.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedReturn.notes}
                  </p>
                </div>
              )}

              {/* Informations de traitement */}
              {selectedReturn.processedBy && selectedReturn.processedAt && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Traité par <span className="font-medium">{selectedReturn.processedBy.name || selectedReturn.processedBy.email}</span> le{" "}
                    {format(new Date(selectedReturn.processedAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fermer
            </Button>
            {selectedReturn?.status === "PENDING" && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    processReturn(selectedReturn.id, "REJECTED")
                    setShowDetailsDialog(false)
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
                <Button 
                  onClick={() => {
                    processReturn(selectedReturn.id, "APPROVED")
                    setShowDetailsDialog(false)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </Button>
              </>
            )}
            {selectedReturn?.status === "APPROVED" && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    processReturn(selectedReturn.id, "EXCHANGED")
                    setShowDetailsDialog(false)
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Échanger
                </Button>
                <Button 
                  onClick={() => {
                    processReturn(selectedReturn.id, "REFUNDED")
                    setShowDetailsDialog(false)
                  }}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Rembourser
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de création de retour */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-3">
              {createStep > 1 && (
                <Button variant="ghost" size="icon" onClick={goBackStep}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Nouveau retour produit
                </SheetTitle>
                <SheetDescription>
                  {createStep === 1 && "Étape 1/3 : Rechercher le client"}
                  {createStep === 2 && "Étape 2/3 : Sélectionner la commande"}
                  {createStep === 3 && "Étape 3/3 : Sélectionner les produits à retourner"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Étape 1: Recherche client */}
            {createStep === 1 && (
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="h-4 w-4" />
                    Rechercher un client
                  </div>
                  <p className="text-sm">
                    Entrez le numéro de téléphone ou le nom du client pour trouver ses commandes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-search">Téléphone ou nom du client</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="customer-search"
                          placeholder="Ex: 0612345678 ou Jean Dupont"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchCustomerOrders()}
                          className="pl-9"
                        />
                      </div>
                      <Button onClick={searchCustomerOrders} disabled={searchingOrders}>
                        {searchingOrders ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {searchingOrders && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}

            {/* Étape 2: Sélection de la commande */}
            {createStep === 2 && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <ShoppingBag className="h-4 w-4" />
                    {customerOrders.length} commande(s) trouvée(s)
                  </div>
                  <p className="text-sm">
                    Sélectionnez la commande concernée par le retour.
                  </p>
                </div>

                <div className="space-y-3">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => selectOrder(order)}
                      className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-primary">{order.number}</span>
                            <Badge variant="outline">{order.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {order.customerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {order.customerPhone}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              {order.items.length} article(s)
                            </span>
                            <span className="font-medium">{order.total.toLocaleString()} FCFA</span>
                            <span className="text-muted-foreground">
                              {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: fr })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Étape 3: Sélection des produits */}
            {createStep === 3 && selectedOrder && (
              <div className="space-y-6">
                {/* Résumé de la commande */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{selectedOrder.number}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedOrder.customerName} • {selectedOrder.customerPhone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{selectedOrder.total.toLocaleString()} FCFA</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(selectedOrder.createdAt), "dd/MM/yyyy", { locale: fr })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Liste des produits */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Produits à retourner</Label>
                    <span className="text-sm text-muted-foreground">
                      {selectedItemsCount} sélectionné(s)
                    </span>
                  </div>

                  <div className="space-y-3">
                    {returnItems.map((item, index) => (
                      <div
                        key={item.storeOrderItemId}
                        className={`border rounded-lg p-4 transition-colors ${
                          item.selected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                        }`}
                      >
                        {/* Header avec checkbox */}
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItemSelection(index)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                {item.productSku && (
                                  <div className="text-xs text-muted-foreground">{item.productSku}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{item.unitPrice.toLocaleString()} FCFA</div>
                                <div className="text-xs text-muted-foreground">
                                  Qté max: {item.maxQuantity}
                                </div>
                              </div>
                            </div>

                            {/* Options si sélectionné */}
                            {item.selected && (
                              <div className="mt-4 space-y-4 pt-4 border-t">
                                {/* Quantité */}
                                <div className="flex items-center gap-4">
                                  <Label className="w-24">Quantité</Label>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                      className="w-16 text-center"
                                      min={1}
                                      max={item.maxQuantity}
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                      disabled={item.quantity >= item.maxQuantity}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    / {item.maxQuantity}
                                  </span>
                                </div>

                                {/* Motif */}
                                <div className="flex items-center gap-4">
                                  <Label className="w-24">Motif</Label>
                                  <Select
                                    value={item.reason}
                                    onValueChange={(value) => updateItemReason(index, value as ReturnReason)}
                                  >
                                    <SelectTrigger className="flex-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {RETURN_REASONS.map((reason) => (
                                        <SelectItem key={reason.value} value={reason.value}>
                                          {reason.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Détails du motif */}
                                {item.reason === "OTHER" && (
                                  <div className="flex items-start gap-4">
                                    <Label className="w-24 pt-2">Détails</Label>
                                    <Textarea
                                      value={item.reasonDetails}
                                      onChange={(e) => updateItemReasonDetails(index, e.target.value)}
                                      placeholder="Précisez le motif..."
                                      className="flex-1"
                                      rows={2}
                                    />
                                  </div>
                                )}

                                {/* Type de résolution */}
                                <div className="flex items-center gap-4">
                                  <Label className="w-24">Résolution</Label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={item.isRefunded}
                                        onChange={() => updateItemIsRefunded(index, true)}
                                        className="w-4 h-4"
                                      />
                                      <span className="flex items-center gap-1 text-sm">
                                        <Banknote className="h-4 w-4 text-green-600" />
                                        Remboursement
                                      </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={!item.isRefunded}
                                        onChange={() => updateItemIsRefunded(index, false)}
                                        className="w-4 h-4"
                                      />
                                      <span className="flex items-center gap-1 text-sm">
                                        <ArrowLeftRight className="h-4 w-4 text-purple-600" />
                                        Échange
                                      </span>
                                    </label>
                                  </div>
                                </div>

                                {/* Sous-total */}
                                <div className="flex items-center justify-end pt-2 border-t">
                                  <span className="text-sm text-muted-foreground mr-2">Sous-total:</span>
                                  <span className="font-semibold">
                                    {(item.quantity * item.unitPrice).toLocaleString()} FCFA
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="return-notes">Notes (optionnel)</Label>
                  <Textarea
                    id="return-notes"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Informations complémentaires sur le retour..."
                    rows={3}
                  />
                </div>

                {/* Résumé et validation */}
                {selectedItemsCount > 0 && (
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Récapitulatif</span>
                      <Badge variant="outline">{selectedItemsCount} article(s)</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      {returnItems.filter(i => i.selected).map((item) => (
                        <div key={item.storeOrderItemId} className="flex items-center justify-between text-sm">
                          <span>
                            {item.productName} x{item.quantity}
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({item.isRefunded ? "Remboursement" : "Échange"})
                            </span>
                          </span>
                          <span>{(item.quantity * item.unitPrice).toLocaleString()} FCFA</span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between font-semibold text-lg">
                      <span>Montant total</span>
                      <span className="text-primary">{calculateTotalRefund().toLocaleString()} FCFA</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" onClick={closeCreateSheet}>
                Annuler
              </Button>
              
              {createStep === 3 && (
                <Button 
                  onClick={createReturn} 
                  disabled={creatingReturn || selectedItemsCount === 0}
                  className="min-w-[150px]"
                >
                  {creatingReturn ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Créer le retour
                    </>
                  )}
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
