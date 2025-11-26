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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
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
  MapPin
} from "lucide-react"
import { toast } from "sonner"
import { formatFCFA } from "@/lib/utils"
import { StorePageHeader } from "@/components/stores/store-page-header"

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
  }
  totalDeliveries: number
  totalOrders: number
  totalRevenue: number
  totalCommission: number
  totalDistance: number
  notes?: string
  createdAt: string
}

interface DriverCloseDetail extends DriverClose {
  deliveries: Array<{
    id: string
    orderNumber: string
    customerName: string
    customerAddress: string
    deliveredAt: string
    orderValue: number
    commission: number
    distance: number
    status: string
  }>
}

interface Stats {
  totalDays: number
  totalDeliveries: number
  totalOrders: number
  totalRevenue: number
  totalCommission: number
  totalDistance: number
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
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

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
      // Pour l'instant, on simule les données car l'API n'existe pas encore
      // TODO: Créer l'API /api/driver-closes
      const mockData = {
        driverCloses: [
          {
            id: "1",
            closeDate: "2024-11-26",
            driver: {
              id: "driver1",
              name: "Jean Livreur",
              email: "jean@example.com",
              phone: "+237 6XX XX XX XX"
            },
            zone: {
              id: "zone1",
              name: "Zone Centre"
            },
            totalDeliveries: 12,
            totalOrders: 15,
            totalRevenue: 125000,
            totalCommission: 12500,
            totalDistance: 45.5,
            notes: "Journée normale, quelques embouteillages",
            createdAt: "2024-11-26T18:30:00Z"
          },
          {
            id: "2",
            closeDate: "2024-11-25",
            driver: {
              id: "driver2",
              name: "Marie Transport",
              email: "marie@example.com",
              phone: "+237 6XX XX XX XX"
            },
            zone: {
              id: "zone2",
              name: "Zone Nord"
            },
            totalDeliveries: 8,
            totalOrders: 10,
            totalRevenue: 89000,
            totalCommission: 8900,
            totalDistance: 32.8,
            notes: "Pluie en fin de journée",
            createdAt: "2024-11-25T19:15:00Z"
          }
        ],
        stats: {
          totalDays: 15,
          totalDeliveries: 180,
          totalOrders: 220,
          totalRevenue: 1850000,
          totalCommission: 185000,
          totalDistance: 650.5,
          averageRevenue: 123333
        },
        pagination: {
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      }

      setDriverCloses(mockData.driverCloses)
      setStats(mockData.stats)
      setTotalPages(mockData.pagination.totalPages)
      setHasNextPage(mockData.pagination.hasNextPage)
      setHasPrevPage(mockData.pagination.hasPrevPage)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des clôtures')
    } finally {
      setLoading(false)
    }
  }

  const loadDrivers = async () => {
    try {
      // TODO: Créer l'API pour récupérer les livreurs du magasin
      const mockDrivers = [
        { id: "driver1", name: "Jean Livreur", email: "jean@example.com" },
        { id: "driver2", name: "Marie Transport", email: "marie@example.com" },
        { id: "driver3", name: "Paul Moto", email: "paul@example.com" }
      ]
      setDrivers(mockDrivers)
    } catch (error) {
      console.error('Erreur lors du chargement des livreurs:', error)
    }
  }

  const loadDriverCloseDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      // TODO: Créer l'API /api/driver-closes/[id]
      const mockDetail = {
        id: id,
        closeDate: "2024-11-26",
        driver: {
          id: "driver1",
          name: "Jean Livreur",
          email: "jean@example.com",
          phone: "+237 6XX XX XX XX"
        },
        zone: {
          id: "zone1",
          name: "Zone Centre"
        },
        totalDeliveries: 12,
        totalOrders: 15,
        totalRevenue: 125000,
        totalCommission: 12500,
        totalDistance: 45.5,
        notes: "Journée normale, quelques embouteillages",
        createdAt: "2024-11-26T18:30:00Z",
        deliveries: [
          {
            id: "del1",
            orderNumber: "CMD-001",
            customerName: "Client A",
            customerAddress: "Rue de la Paix, Douala",
            deliveredAt: "2024-11-26T10:30:00Z",
            orderValue: 15000,
            commission: 1500,
            distance: 3.2,
            status: "DELIVERED"
          },
          {
            id: "del2",
            orderNumber: "CMD-002",
            customerName: "Client B",
            customerAddress: "Avenue Kennedy, Douala",
            deliveredAt: "2024-11-26T11:45:00Z",
            orderValue: 25000,
            commission: 2500,
            distance: 5.8,
            status: "DELIVERED"
          }
        ]
      }

      setSelectedDriverClose(mockDetail)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du détail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const resetFilters = () => {
    setSelectedDriver("all")
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const filteredDriverCloses = driverCloses.filter(driverClose => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      driverClose.driver.name.toLowerCase().includes(searchLower) ||
      driverClose.zone.name.toLowerCase().includes(searchLower) ||
      driverClose.notes?.toLowerCase().includes(searchLower)
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
                      <TableHead className="text-right">Distance</TableHead>
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
                            {driverClose.zone.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{driverClose.totalDeliveries}</Badge>
                          <div className="text-xs text-gray-500">{driverClose.totalOrders} cmd</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium">{driverClose.totalDistance} km</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatFCFA(driverClose.totalCommission)}</div>
                          <div className="text-xs text-gray-500">
                            CA: {formatFCFA(driverClose.totalRevenue)}
                          </div>
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
                            disabled={loadingDetail}
                          >
                            <Eye className="h-4 w-4" />
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

        {/* Modal de détail */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Détail de la clôture livreur - {selectedDriverClose && new Date(selectedDriverClose.closeDate).toLocaleDateString('fr-FR')}
              </DialogTitle>
              <DialogDescription>
                {selectedDriverClose && (
                  <>
                    {store?.name} • {selectedDriverClose.zone.name} • Clôturé par {selectedDriverClose.driver.name}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedDriverClose && (
              <div className="space-y-6">
                {/* Résumé */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedDriverClose.totalDeliveries}</div>
                    <div className="text-sm text-blue-700">Livraisons</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedDriverClose.totalOrders}</div>
                    <div className="text-sm text-green-700">Commandes</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{formatFCFA(selectedDriverClose.totalCommission)}</div>
                    <div className="text-sm text-purple-700">Commission</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{selectedDriverClose.totalDistance} km</div>
                    <div className="text-sm text-orange-700">Distance</div>
                  </div>
                </div>

                {/* Détail des livraisons */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Détail des livraisons</h3>
                  {selectedDriverClose.deliveries && selectedDriverClose.deliveries.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDriverClose.deliveries.map((delivery, index) => (
                        <div key={delivery.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{delivery.orderNumber} - {delivery.customerName}</div>
                              <div className="text-xs text-gray-600 flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                {delivery.customerAddress}
                              </div>
                              <div className="text-xs text-gray-600">
                                Livré à {new Date(delivery.deliveredAt).toLocaleTimeString('fr-FR')} •
                                {delivery.distance} km
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatFCFA(delivery.orderValue)}</div>
                              <div className="text-xs text-green-600">
                                Commission: {formatFCFA(delivery.commission)}
                              </div>
                              <Badge variant={delivery.status === 'DELIVERED' ? 'default' : 'secondary'} className="text-xs">
                                {delivery.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Aucune livraison détaillée disponible
                    </div>
                  )}
                </div>

                {/* Totaux */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Chiffre d'affaires généré:</span>
                    <span>{formatFCFA(selectedDriverClose.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Distance parcourue:</span>
                    <span>{selectedDriverClose.totalDistance} km</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>COMMISSION TOTALE:</span>
                    <span className="text-green-600">{formatFCFA(selectedDriverClose.totalCommission)}</span>
                  </div>
                </div>

                {selectedDriverClose.notes && (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">Notes:</div>
                    <div className="text-sm text-yellow-700">{selectedDriverClose.notes}</div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
