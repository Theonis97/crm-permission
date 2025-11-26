"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Eye,
  ExternalLink,
  Clock,
  Users,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  MoreHorizontal,
  Receipt
} from "lucide-react"
import { toast } from "sonner"
import { formatFCFA } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface DayClose {
  id: string
  closeDate: string
  user: {
    id: string
    name: string
    email: string
  }
  totalSales: number
  totalItems: number
  subtotal: number
  totalTax: number
  totalDiscounts: number
  totalRevenue: number
  notes?: string
  createdAt: string
}

interface DayCloseDetail extends DayClose {
  sales: Array<{
    id: string
    createdAt: string
    customerName: string
    items: Array<{
      productName: string
      quantity: number
      unitPrice: number
      total: number
    }>
    itemCount: number
    subtotal: number
    tax: number
    total: number
  }>
}

interface StoreDayClosesProps {
  storeId: string
}

export function StoreDayCloses({ storeId }: StoreDayClosesProps) {
  const router = useRouter()
  const [dayCloses, setDayCloses] = useState<DayClose[]>([])
  const [selectedDayClose, setSelectedDayClose] = useState<DayCloseDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Statistiques rapides
  const [stats, setStats] = useState({
    totalDays: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    totalSales: 0
  })

  useEffect(() => {
    loadDayCloses()
  }, [storeId])

  const loadDayCloses = async () => {
    setLoading(true)
    try {
      // Charger les 7 dernières clôtures du magasin
      const params = new URLSearchParams({
        storeId: storeId,
        limit: '7'
      })

      const response = await fetch(`/api/day-closes?${params}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }

      const data = await response.json()
      setDayCloses(data.dayCloses)
      
      // Calculer les stats pour ce magasin
      setStats({
        totalDays: data.stats.totalDays,
        totalRevenue: data.stats.totalRevenue,
        averageRevenue: data.stats.averageRevenue,
        totalSales: data.stats.totalSales
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des clôtures')
    } finally {
      setLoading(false)
    }
  }

  const loadDayCloseDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/day-closes/${id}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du détail')
      }

      const data = await response.json()
      setSelectedDayClose(data)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du détail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleViewAll = () => {
    router.push(`/dashboard/stores/${storeId}/day-closes`)
  }

  return (
    <>
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
              <CardTitle className="text-sm font-medium text-gray-600">Clôtures de journée</CardTitle>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleViewAll}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Stats rapides */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{stats.totalDays}</div>
                <div className="text-xs text-gray-500">Journées</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{stats.totalSales}</div>
                <div className="text-xs text-gray-500">Ventes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-violet-600">{formatFCFA(stats.totalRevenue)}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
            </div>
          ) : dayCloses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucune clôture enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayCloses.map((dayClose) => (
                <div
                  key={dayClose.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {new Date(dayClose.closeDate).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {dayClose.user.name}
                        <span>•</span>
                        <ShoppingCart className="h-3 w-3" />
                        {dayClose.totalSales} vente{dayClose.totalSales > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-bold text-sm">{formatFCFA(dayClose.totalRevenue)}</div>
                      <div className="text-xs text-gray-500">
                        {dayClose.totalItems} article{dayClose.totalItems > 1 ? 's' : ''}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadDayCloseDetail(dayClose.id)}
                      disabled={loadingDetail}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Bouton voir tout */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewAll}
                  className="w-full text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                >
                  Voir toutes les clôtures
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de détail */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Détail de la clôture - {selectedDayClose && new Date(selectedDayClose.closeDate).toLocaleDateString('fr-FR')}
            </DialogTitle>
            <DialogDescription>
              {selectedDayClose && (
                <>
                  Clôturé par {selectedDayClose.user.name} le {new Date(selectedDayClose.createdAt).toLocaleString('fr-FR')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDayClose && (
            <div className="space-y-6">
              {/* Résumé */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{selectedDayClose.totalSales}</div>
                  <div className="text-sm text-blue-700">Ventes</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{selectedDayClose.totalItems}</div>
                  <div className="text-sm text-green-700">Articles</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">{formatFCFA(selectedDayClose.totalRevenue)}</div>
                  <div className="text-sm text-purple-700">Recette</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">{formatFCFA(selectedDayClose.totalTax)}</div>
                  <div className="text-sm text-orange-700">TVA</div>
                </div>
              </div>

              {/* Détail des ventes */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Détail des ventes</h3>
                {selectedDayClose.sales && selectedDayClose.sales.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedDayClose.sales.map((sale, index) => (
                      <div key={sale.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{sale.customerName}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(sale.createdAt).toLocaleTimeString('fr-FR')} • 
                              {sale.itemCount} article{sale.itemCount > 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatFCFA(sale.total)}</div>
                            <div className="text-xs text-gray-500">Espèces</div>
                          </div>
                        </div>
                        
                        {/* Articles de la vente */}
                        <div className="space-y-1">
                          {sale.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.productName}</span>
                              <span>{formatFCFA(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Aucune vente détaillée disponible
                  </div>
                )}
              </div>

              {/* Totaux */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total:</span>
                  <span>{formatFCFA(selectedDayClose.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA:</span>
                  <span>{formatFCFA(selectedDayClose.totalTax)}</span>
                </div>
                {selectedDayClose.totalDiscounts > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Remises accordées:</span>
                    <span>-{formatFCFA(selectedDayClose.totalDiscounts)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL ENCAISSÉ:</span>
                  <span className="text-green-600">{formatFCFA(selectedDayClose.totalRevenue)}</span>
                </div>
              </div>

              {selectedDayClose.notes && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-yellow-800">Notes:</div>
                  <div className="text-sm text-yellow-700">{selectedDayClose.notes}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
