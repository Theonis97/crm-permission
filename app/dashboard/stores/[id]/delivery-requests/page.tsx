"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Package,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  MoreHorizontal,
  Eye,
  Check,
  X,
  Loader2,
  Phone,
  Mail,
  Truck,
  Search,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Réutiliser les interfaces du composant sheet
interface RestockingRequestItem {
  id: string
  productId: string
  variantId?: string
  requestedQuantity: number
  approvedQuantity?: number
  notes?: string
  product: {
    id: string
    name: string
    sku: string
    photos: string[]
  }
  variant?: {
    id: string
    name: string
    sku: string
    attributes: any
  }
}

interface RestockingRequest {
  id: string
  deliveryPersonId: string
  storeId: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  notes?: string
  rejectionReason?: string
  approvedById?: string
  approvedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  deliveryPerson: {
    id: string
    name: string
    phone: string
  }
  store: {
    id: string
    name: string
  }
  approvedBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  items: RestockingRequestItem[]
}

export default function DeliveryRequestsPage() {
  const params = useParams()
  const storeId = params.id as string
  const [storeName, setStoreName] = useState<string>("")
  const [requests, setRequests] = useState<RestockingRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<RestockingRequest | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [approvalItems, setApprovalItems] = useState<Array<{id: string, approvedQuantity: number}>>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const loadStoreInfo = async () => {
      try {
        const response = await fetch(`/api/stores/${storeId}`)
        if (response.ok) {
          const store = await response.json()
          setStoreName(store.name)
        }
      } catch (error) {
        console.error("Error loading store info:", error)
      }
    }

    if (storeId) {
      loadStoreInfo()
      loadRequests()
    }
  }, [storeId])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      
      params.append("storeId", storeId)

      const response = await fetch(`/api/restocking-requests?${params}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setRequests(data.data || [])
    } catch (error) {
      console.error("Error loading restocking requests:", error)
      toast.error("Erreur lors du chargement des demandes")
    } finally {
      setLoading(false)
    }
  }

  // Fonctions d'approbation et de rejet
  const handleApprove = (request: RestockingRequest) => {
    setSelectedRequest(request)
    setApprovalItems(request.items.map(item => ({
      id: item.id,
      approvedQuantity: item.requestedQuantity
    })))
    setShowApprovalDialog(true)
  }

  const handleReject = (request: RestockingRequest) => {
    setSelectedRequest(request)
    setRejectionReason("")
    setShowRejectionDialog(true)
  }

  const submitApproval = async () => {
    if (!selectedRequest) return

    try {
      setProcessing(true)
      const response = await fetch(`/api/restocking-requests/${selectedRequest.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: approvalItems })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de l'approbation")
      }

      toast.success("Demande approuvée avec succès")
      setShowApprovalDialog(false)
      setSelectedRequest(null)
      loadRequests()
    } catch (error: any) {
      console.error("Error approving request:", error)
      toast.error(error.message || "Erreur lors de l'approbation")
    } finally {
      setProcessing(false)
    }
  }

  const submitRejection = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Veuillez saisir une raison de rejet")
      return
    }

    try {
      setProcessing(true)
      const response = await fetch(`/api/restocking-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          rejectionReason: rejectionReason.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors du rejet")
      }

      toast.success("Demande rejetée")
      setShowRejectionDialog(false)
      setSelectedRequest(null)
      setRejectionReason("")
      loadRequests()
    } catch (error: any) {
      console.error("Error rejecting request:", error)
      toast.error(error.message || "Erreur lors du rejet")
    } finally {
      setProcessing(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, any> = {
      PENDING: {
        icon: Clock,
        className: "border-amber-200 text-amber-700 bg-amber-50",
        label: "En attente",
      },
      APPROVED: {
        icon: CheckCircle2,
        className: "border-blue-200 text-blue-700 bg-blue-50",
        label: "Approuvée",
      },
      REJECTED: {
        icon: XCircle,
        className: "border-red-200 text-red-700 bg-red-50",
        label: "Rejetée",
      },
      COMPLETED: {
        icon: CheckCircle2,
        className: "border-green-200 text-green-700 bg-green-50",
        label: "Terminée",
      },
    }
    return config[status] || config.PENDING
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = getStatusConfig(status)
    return (
      <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
        <statusConfig.icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.deliveryPerson.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "PENDING").length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    completed: requests.filter(r => r.status === "COMPLETED").length,
    rejected: requests.filter(r => r.status === "REJECTED").length,
  }

  return (
    <>
      <StorePageHeader
        title="Demandes d'approvisionnement"
        description="Gérer les demandes d'approvisionnement des livreurs"
        icon={Truck}
        actions={
          <Button
            variant="outline"
            onClick={loadRequests}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">En attente</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
              <div className="text-sm text-gray-600">Approuvées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Terminées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-600">Rejetées</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par livreur ou notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="APPROVED">Approuvées</SelectItem>
                  <SelectItem value="COMPLETED">Terminées</SelectItem>
                  <SelectItem value="REJECTED">Rejetées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des demandes */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Chargement des demandes...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune demande d'approvisionnement</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Livreur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.deliveryPerson.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.deliveryPerson.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(request.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{request.items.length} produit(s)</div>
                          <div className="text-gray-500">
                            {request.items.slice(0, 2).map(item => item.product.name).join(", ")}
                            {request.items.length > 2 && "..."}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs truncate">
                          {request.notes || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {request.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(request)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedRequest(request)
                                setShowDetails(true)
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir les détails
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog d'approbation */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approuver la demande</DialogTitle>
            <DialogDescription>
              Ajustez les quantités à approuver pour chaque produit
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedRequest.items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      {item.product.photos && item.product.photos.length > 0 ? (
                        <img
                          src={item.product.photos[0]}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                        {item.variant && (
                          <p className="text-sm text-blue-600">Variante: {item.variant.name}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                            <span className="text-xs text-gray-600">Demandé: </span>
                            <span className="font-bold text-blue-600">{item.requestedQuantity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-32">
                      <Label className="text-sm font-medium text-gray-700">Quantité à approuver</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={item.requestedQuantity}
                          value={approvalItems[index]?.approvedQuantity || 0}
                          onChange={(e) => {
                            const newItems = [...approvalItems]
                            newItems[index] = {
                              ...newItems[index],
                              approvedQuantity: parseInt(e.target.value) || 0
                            }
                            setApprovalItems(newItems)
                          }}
                          className="text-center font-bold"
                        />
                      </div>
                      <div className="mt-1 flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newItems = [...approvalItems]
                            newItems[index] = {
                              ...newItems[index],
                              approvedQuantity: item.requestedQuantity
                            }
                            setApprovalItems(newItems)
                          }}
                          className="text-xs px-2 py-1 h-6"
                        >
                          Max
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newItems = [...approvalItems]
                            newItems[index] = {
                              ...newItems[index],
                              approvedQuantity: 0
                            }
                            setApprovalItems(newItems)
                          }}
                          className="text-xs px-2 py-1 h-6"
                        >
                          0
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitApproval} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approbation...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approuver
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de rejet */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du rejet de cette demande
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Raison du rejet *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Expliquez pourquoi cette demande est rejetée..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitRejection} 
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejet...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Rejeter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de détails en format facture */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="w-[800px] sm:max-w-[800px]">
          <SheetHeader>
            <SheetTitle>Détails de la demande d'approvisionnement</SheetTitle>
            <SheetDescription>
              Demande #{selectedRequest?.id.slice(-8).toUpperCase()}
            </SheetDescription>
          </SheetHeader>
          
          {selectedRequest && (
            <div className="mt-6 space-y-6">
              {/* En-tête facture */}
              <div className="border-b pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Demande d'approvisionnement
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      #{selectedRequest.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Date de création</div>
                    <div className="font-medium">{formatDate(selectedRequest.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Informations livreur et magasin */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Demandeur</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium">{selectedRequest.deliveryPerson.name}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {selectedRequest.deliveryPerson.phone}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Livreur
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Magasin</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium">{selectedRequest.store.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Magasin d'approvisionnement
                    </div>
                  </div>
                </div>
              </div>

              {/* Statut et informations */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Statut</h4>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  {selectedRequest.approvedAt && (
                    <div className="text-sm text-gray-600 mt-2">
                      Approuvée le {formatDate(selectedRequest.approvedAt)}
                    </div>
                  )}
                  {selectedRequest.completedAt && (
                    <div className="text-sm text-gray-600 mt-1">
                      Terminée le {formatDate(selectedRequest.completedAt)}
                    </div>
                  )}
                </div>
                {selectedRequest.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedRequest.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Raison de rejet si applicable */}
              {selectedRequest.rejectionReason && (
                <div>
                  <h4 className="font-medium text-red-900 mb-3">Raison du rejet</h4>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="text-sm text-red-700">{selectedRequest.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Tableau des produits */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Produits demandés</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-center">Qté demandée</TableHead>
                        <TableHead className="text-center">Qté approuvée</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRequest.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {item.product.photos && item.product.photos.length > 0 ? (
                                <img
                                  src={item.product.photos[0]}
                                  alt={item.product.name}
                                  className="w-10 h-10 object-cover rounded border"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded border flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">{item.product.name}</div>
                                <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                                {item.variant && (
                                  <div className="text-sm text-blue-600">
                                    Variante: {item.variant.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1 inline-block">
                              <span className="font-bold text-blue-600">{item.requestedQuantity}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.approvedQuantity !== undefined && item.approvedQuantity !== null ? (
                              <div className="bg-green-50 border border-green-200 rounded px-3 py-1 inline-block">
                                <span className="font-bold text-green-600">{item.approvedQuantity}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {item.notes || "-"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Résumé */}
              <div className="border-t pt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedRequest.items.length}
                      </div>
                      <div className="text-sm text-gray-600">Produits</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedRequest.items.reduce((sum, item) => sum + item.requestedQuantity, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Qté totale demandée</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedRequest.items.reduce((sum, item) => sum + (item.approvedQuantity || 0), 0)}
                      </div>
                      <div className="text-sm text-gray-600">Qté totale approuvée</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
