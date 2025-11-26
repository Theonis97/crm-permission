"use client"

import { useState, useEffect } from "react"
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
  Store,
  Clock,
  Receipt
} from "lucide-react"
import { toast } from "sonner"
import { formatFCFA } from "@/lib/utils"

interface DayClose {
  id: string
  closeDate: string
  store: {
    id: string
    name: string
    address?: string
  }
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

interface Stats {
  totalDays: number
  totalSales: number
  totalItems: number
  totalRevenue: number
  totalTax: number
  totalDiscounts: number
  averageRevenue: number
}

interface Store {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

export default function DayClosesPage() {
  const [dayCloses, setDayCloses] = useState<DayClose[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedDayClose, setSelectedDayClose] = useState<DayCloseDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Filtres
  const [selectedStore, setSelectedStore] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
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
    loadDayCloses()
    loadStores()
    loadUsers()
  }, [currentPage, selectedStore, selectedUser, startDate, endDate])

  const loadDayCloses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })

      if (selectedStore && selectedStore !== 'all') params.append('storeId', selectedStore)
      if (selectedUser && selectedUser !== 'all') params.append('userId', selectedUser)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/day-closes?${params}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }

      const data = await response.json()
      setDayCloses(data.dayCloses)
      setStats(data.stats)
      setTotalPages(data.pagination.totalPages)
      setHasNextPage(data.pagination.hasNextPage)
      setHasPrevPage(data.pagination.hasPrevPage)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des clôtures')
    } finally {
      setLoading(false)
    }
  }

  const loadStores = async () => {
    try {
      const response = await fetch('/api/stores')
      if (response.ok) {
        const data = await response.json()
        setStores(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des magasins:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
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

  const resetFilters = () => {
    setSelectedStore("all")
    setSelectedUser("all")
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const filteredDayCloses = dayCloses.filter(dayClose => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      dayClose.store.name.toLowerCase().includes(searchLower) ||
      dayClose.user.name.toLowerCase().includes(searchLower) ||
      dayClose.notes?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clôtures de journée</h1>
          <p className="text-gray-600 mt-1">
            Consultez l'historique des clôtures de caisse
          </p>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total journées</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDays}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total ventes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalItems} articles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recette totale</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFCFA(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                TVA: {formatFCFA(stats.totalTax)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Moyenne/jour</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFCFA(stats.averageRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Magasin, utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Magasin</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les magasins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les magasins</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Utilisateur</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les utilisateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
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

          <div className="flex gap-2 mt-4">
            <Button onClick={loadDayCloses} disabled={loading}>
              Appliquer les filtres
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des clôtures */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des clôtures</CardTitle>
          <CardDescription>
            {filteredDayCloses.length} clôture{filteredDayCloses.length > 1 ? 's' : ''} trouvée{filteredDayCloses.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Chargement...</p>
              </div>
            </div>
          ) : filteredDayCloses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Aucune clôture trouvée</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Magasin</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Articles</TableHead>
                    <TableHead className="text-right">Recette</TableHead>
                    <TableHead className="text-right">Clôturé le</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDayCloses.map((dayClose) => (
                    <TableRow key={dayClose.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(dayClose.closeDate).toLocaleDateString('fr-FR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{dayClose.store.name}</div>
                            {dayClose.store.address && (
                              <div className="text-xs text-gray-500">{dayClose.store.address}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{dayClose.user.name}</div>
                            <div className="text-xs text-gray-500">{dayClose.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{dayClose.totalSales}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-gray-600">{dayClose.totalItems}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatFCFA(dayClose.totalRevenue)}</div>
                        {dayClose.totalDiscounts > 0 && (
                          <div className="text-xs text-red-600">
                            -{formatFCFA(dayClose.totalDiscounts)} remise
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(dayClose.createdAt).toLocaleString('fr-FR')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadDayCloseDetail(dayClose.id)}
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
              <Receipt className="h-5 w-5" />
              Détail de la clôture - {selectedDayClose && new Date(selectedDayClose.closeDate).toLocaleDateString('fr-FR')}
            </DialogTitle>
            <DialogDescription>
              {selectedDayClose && (
                <>
                  {selectedDayClose.store.name} • Clôturé par {selectedDayClose.user.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDayClose && (
            <div className="space-y-6">
              {/* Résumé */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedDayClose.totalSales}</div>
                  <div className="text-sm text-blue-700">Ventes</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedDayClose.totalItems}</div>
                  <div className="text-sm text-green-700">Articles</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatFCFA(selectedDayClose.totalRevenue)}</div>
                  <div className="text-sm text-purple-700">Recette</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{formatFCFA(selectedDayClose.totalTax)}</div>
                  <div className="text-sm text-orange-700">TVA</div>
                </div>
              </div>

              {/* Détail des ventes */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Détail des ventes</h3>
                {selectedDayClose.sales && selectedDayClose.sales.length > 0 ? (
                  <div className="space-y-2">
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
    </div>
  )
}
