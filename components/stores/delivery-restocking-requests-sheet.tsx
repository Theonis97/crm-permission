"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

interface DeliveryRestockingRequestsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
}

export function DeliveryRestockingRequestsSheet({
  open,
  onOpenChange,
  storeId,
  storeName,
}: DeliveryRestockingRequestsSheetProps) {
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
    if (open) {
      loadRequests()
    }
  }, [open, storeId])

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

  const handleApprove = (request: RestockingRequest) => {
    setSelectedRequest(request)
    // Initialiser les quantités approuvées avec les quantités demandées
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: approvalItems,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'approbation")
      }

      toast.success("Demande approuvée et stock transféré avec succès")
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
      toast.error("Veuillez indiquer la raison du rejet")
      return
    }

    try {
      setProcessing(true)
      
      const response = await fetch(`/api/restocking-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors du rejet")
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

  const handleViewDetails = (request: RestockingRequest) => {
    setSelectedRequest(request)
    setShowDetails(true)
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="min-w-[900px] max-w-[95vw] p-0 overflow-visible">
          <SheetHeader className="px-4 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Demandes d'approvisionnement livreurs
                </SheetTitle>
                <SheetDescription>
                  {storeName} • {stats.total} demande(s) au total
                </SheetDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRequests}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Actualiser
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-visible">
            {/* Stats rapides */}
            <div className="grid grid-cols-5 gap-4 p-6 border-b bg-gray-50">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">En attente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
                <div className="text-sm text-gray-600">Approuvées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Terminées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-gray-600">Rejetées</div>
              </div>
            </div>

            {/* Filtres */}
            <div className="p-6 border-b space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par livreur ou notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
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
            </div>

            {/* Liste des demandes */}
            <div className="p-6">
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
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{request.deliveryPerson.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Phone className="h-3 w-3" />
                              {request.deliveryPerson.phone}
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(request.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {request.items.length} produit(s)
                            </div>
                          </div>

                          {/* Liste des produits demandés */}
                          <div className="mb-3">
                            <div className="space-y-2">
                              {request.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-900">{item.product.name}</span>
                                    {item.variant && (
                                      <span className="text-gray-500 ml-2">- {item.variant.name}</span>
                                    )}
                                    <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-900">
                                      Qté: {item.requestedQuantity}
                                    </div>
                                    {item.approvedQuantity !== undefined && item.approvedQuantity !== null && (
                                      <div className="text-xs text-green-600">
                                        Approuvé: {item.approvedQuantity}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {request.notes && (
                            <p className="text-sm text-gray-600 italic mb-2">
                              💬 "{request.notes}"
                            </p>
                          )}

                          {request.rejectionReason && (
                            <p className="text-sm text-red-600 mt-2">
                              <strong>❌ Raison du rejet:</strong> {request.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {request.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(request)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rejeter
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
                              <DropdownMenuItem onClick={() => handleViewDetails(request)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir les détails
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de détails */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
            <DialogDescription>
              Demande de {selectedRequest?.deliveryPerson.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Livreur</Label>
                  <p className="text-sm">{selectedRequest.deliveryPerson.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Téléphone</Label>
                  <p className="text-sm">{selectedRequest.deliveryPerson.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Statut</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date de création</Label>
                  <p className="text-sm">{formatDate(selectedRequest.createdAt)}</p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-gray-600">{selectedRequest.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Produits demandés ({selectedRequest.items.length})</Label>
                <div className="mt-2 space-y-3">
                  {selectedRequest.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
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
                              <p className="font-medium text-gray-900">{item.product.name}</p>
                              <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                            </div>
                          </div>
                          {item.variant && (
                            <div className="ml-12">
                              <p className="text-sm text-blue-600 font-medium">
                                Variante: {item.variant.name}
                              </p>
                              <p className="text-xs text-gray-500">SKU variante: {item.variant.sku}</p>
                            </div>
                          )}
                          {item.notes && (
                            <div className="ml-12 mt-2">
                              <p className="text-sm text-gray-600 italic">
                                💬 {item.notes}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                            <p className="text-sm text-gray-600">Quantité demandée</p>
                            <p className="text-lg font-bold text-blue-600">{item.requestedQuantity}</p>
                          </div>
                          {item.approvedQuantity !== undefined && item.approvedQuantity !== null && (
                            <div className="bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">
                              <p className="text-sm text-gray-600">Quantité approuvée</p>
                              <p className="text-lg font-bold text-green-600">{item.approvedQuantity}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="space-y-4">
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
                  Approuver et transférer
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
              Indiquez la raison du rejet de cette demande
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Raison du rejet</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Expliquez pourquoi cette demande est rejetée..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
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
    </>
  )
}
