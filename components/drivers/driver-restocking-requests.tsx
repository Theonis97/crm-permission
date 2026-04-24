"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  X,
  AlertCircle,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
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
  }
}

interface RestockingRequest {
  id: string
  deliveryPersonId: string
  storeId: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  notes?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  items: RestockingRequestItem[]
}

interface DriverRestockingRequestsProps {
  driverId: string
}

export function DriverRestockingRequests({ driverId }: DriverRestockingRequestsProps) {
  const [requests, setRequests] = useState<RestockingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États pour les dialogs
  const [selectedRequest, setSelectedRequest] = useState<RestockingRequest | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [approvalItems, setApprovalItems] = useState<Array<{id: string, approvedQuantity: number}>>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [driverId])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/restocking-requests?deliveryPersonId=${driverId}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setRequests(data.data || [])
    } catch (err) {
      console.error("Error loading restocking requests:", err)
      setError("Impossible de charger les demandes")
    } finally {
      setLoading(false)
    }
  }

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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; className: string; label: string }> = {
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
    const statusConfig = config[status] || config.PENDING
    const Icon = statusConfig.icon
    
    return (
      <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "PENDING").length,
    approved: requests.filter(r => r.status === "APPROVED" || r.status === "COMPLETED").length,
    rejected: requests.filter(r => r.status === "REJECTED").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>{error}</p>
        <Button variant="outline" onClick={loadRequests} className="mt-4">
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br py-0 from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-200 rounded-lg">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-amber-600">En attente</p>
                <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
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
                <p className="text-sm text-green-600">Approuvées</p>
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-sm text-red-600">Rejetées</p>
                <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des demandes */}
      <div>
        {requests.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 bg-white hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-500">{formatDate(request.createdAt)}</p>
                      <p className="font-medium mt-1">
                        {request.items.length} produit{request.items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Liste des produits */}
                  <div className="space-y-2 mb-3">
                    {request.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          {item.product.photos?.[0] ? (
                            <img
                              src={item.product.photos[0]}
                              alt={item.product.name}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="flex-1 truncate">{item.product.name}</span>
                        <span className="font-medium text-blue-600">x{item.requestedQuantity}</span>
                        {item.approvedQuantity !== undefined && item.approvedQuantity !== null && (
                          <span className="text-green-600">→ {item.approvedQuantity}</span>
                        )}
                      </div>
                    ))}
                    {request.items.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{request.items.length - 3} autre(s) produit(s)
                      </p>
                    )}
                  </div>

                  {/* Raison de rejet */}
                  {request.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                      <p className="text-xs text-red-700">
                        <strong>Raison du rejet:</strong> {request.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Actions pour les demandes en attente */}
                  {request.status === "PENDING" && (
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request)}
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Aucune demande d'approvisionnement</p>
          </div>
        )}
      </div>

      {/* Dialog d'approbation */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approuver la demande</DialogTitle>
            <DialogDescription>
              Ajustez les quantités à approuver pour chaque produit
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {selectedRequest.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        {item.product.photos?.[0] ? (
                          <img
                            src={item.product.photos[0]}
                            alt={item.product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">Demandé: {item.requestedQuantity}</p>
                      </div>
                      <div className="w-20">
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
                          className="text-center text-sm h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitApproval} disabled={processing} className="bg-green-600 hover:bg-green-700">
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
              Veuillez indiquer la raison du rejet
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
    </div>
  )
}
