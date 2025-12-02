"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Calendar,
  Eye,
  Search,
  Filter,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  Receipt,
  Truck,
  MapPin,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { formatFCFA } from "@/lib/utils"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { DriverCloseInvoiceSheet } from "@/components/driver-closes"

interface DriverClose {
  id: string
  closeDate: string
  driver: {
    id: string
    name: string
    email: string
    phone?: string
  }
  zone: {
    id: string
    name: string
  } | null
  totalDeliveries: number
  totalOrders: number
  totalRevenue: number
  totalCommission: number
  createdAt: string
}

interface DriverCloseDetail extends DriverClose {
  deliveries: Array<{
    id: string
    orderNumber: string
    customerName: string
    customerPhone: string
    customerAddress: string
    deliveredAt: string
    orderValue: number
    commission: number
    status: string
    paymentMethod: string
    amountReceived: number
    changeGiven: number
    items: Array<{
      id: string
      productName: string
      sku: string
      quantity: number
      unitPrice: number
      total: number
      photo?: string
    }>
  }>
}

interface Stats {
  totalDays: number
  totalDeliveries: number
  totalOrders: number
  totalRevenue: number
  totalCommission: number
  averageRevenue: number
}

interface Driver {
  id: string
  name: string
  email: string
  phone?: string
}

interface Store {
  id: string
  name: string
}

interface DriverClosesPageProps {
  params: Promise<{
    id: string
  }>
}

export default function DriverClosesPage({ params }: DriverClosesPageProps) {
  const { id: storeId } = use(params)
  const [store, setStore] = useState<Store | null>(null)
  const [driverCloses, setDriverCloses] = useState<DriverClose[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriverClose, setSelectedDriverClose] = useState<DriverCloseDetail | null>(null)
  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)

  // Filtres
  const [selectedDriver, setSelectedDriver] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)

  // Charger les données initiales
  useEffect(() => {
    loadStore()
    loadDriverCloses()
    loadDrivers()
  }, [storeId, currentPage, selectedDriver, startDate, endDate])

  const loadStore = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`)
      if (response.ok) {
        const data = await response.json()
        setStore(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du magasin:', error)
    }
  }

  const loadDriverCloses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        storeId,
        page: currentPage.toString(),
        limit: '10'
      })

      if (selectedDriver && selectedDriver !== 'all') {
        params.append('driverId', selectedDriver)
      }
      if (startDate) {
        params.append('startDate', startDate)
      }
      if (endDate) {
        params.append('endDate', endDate)
      }

      const response = await fetch(`/api/driver-closes?${params}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des clôtures')
      }

      const data = await response.json()
      setDriverCloses(data.driverCloses || [])
      setStats(data.stats || null)
      setTotalPages(data.pagination?.totalPages || 1)
      setHasNextPage(data.pagination?.hasNextPage || false)
      setHasPrevPage(data.pagination?.hasPrevPage || false)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des clôtures')
    } finally {
      setLoading(false)
    }
  }

  const loadDrivers = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/delivery-persons`)
      if (response.ok) {
        const data = await response.json()
        setDrivers(data.deliveryPersons || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des livreurs:', error)
    }
  }

  const loadDriverCloseDetail = async (id: string) => {
    setLoadingDetail(id)
    try {
      console.log(`🔍 Chargement détail clôture: ${id}`)
      const response = await fetch(`/api/driver-closes/${id}`)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Erreur API:', errorData)
        throw new Error(errorData.details || errorData.error || 'Erreur lors du chargement du détail')
      }

      const data = await response.json()
      console.log('✅ Détail clôture chargé:', data)
      setSelectedDriverClose(data)
      setShowInvoiceSheet(true)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement du détail')
    } finally {
      setLoadingDetail(null)
    }
  }

  const resetFilters = () => {
    setSelectedDriver("all")
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const filteredDriverCloses = driverCloses.filter((driverClose) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      driverClose.driver.name.toLowerCase().includes(searchLower) ||
      (driverClose.zone?.name || '').toLowerCase().includes(searchLower)
    )
  })

  return (
    <>
      <StorePageHeader
        title="Clôtures Livreurs"
        description={`Historique des clôtures de livraison${store ? ` - ${store.name}` : ''}`}
        icon={Truck}
      />

      <div className="container mx-auto p-6 space-y-6">
 
        {/* Filtres */}
        <Card>

          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-row gap-2">
                <div className="space-y-2">
                <label className="text-sm font-medium">Livreur</label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les livreurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les livreurs</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date début</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date fin</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={loadDriverCloses} disabled={loading}>
                  Appliquer les filtres
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              </div>
            </div>


          </CardContent>
        </Card>

        {/* Tableau des clôtures */}
        <Card>
        
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Chargement...</p>
                </div>
              </div>
            ) : filteredDriverCloses.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Aucune clôture trouvée</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Livreur</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Livraisons</TableHead>
                      <TableHead className="text-right">CA Généré</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Clôturé le</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDriverCloses.map((driverClose) => (
                      <TableRow key={driverClose.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {new Date(driverClose.closeDate).toLocaleDateString('fr-FR')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{driverClose.driver.name}</div>
                              <div className="text-xs text-gray-500">{driverClose.driver.phone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {driverClose.zone?.name || 'Non assignée'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{driverClose.totalDeliveries}</Badge>
                          <div className="text-xs text-gray-500">{driverClose.totalOrders} cmd</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold">{formatFCFA(driverClose.totalRevenue - driverClose.totalCommission)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium text-green-600">{formatFCFA(driverClose.totalCommission)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {new Date(driverClose.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadDriverCloseDetail(driverClose.id)}
                            disabled={loadingDetail === driverClose.id}
                            title="Voir les détails de la journée"
                          >
                            {loadingDetail === driverClose.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        disabled={!hasPrevPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!hasNextPage}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Sheet de détail type facture */}
        <DriverCloseInvoiceSheet
          isOpen={showInvoiceSheet}
          onClose={() => setShowInvoiceSheet(false)}
          driverClose={selectedDriverClose}
          storeName={store?.name}
        />
      </div>
    </>
  )
}
