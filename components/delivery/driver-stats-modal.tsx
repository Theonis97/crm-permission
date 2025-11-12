"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Phone,
  Mail,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react"

interface DriverStatsModalProps {
  driverId: string | null
  driverName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DriverStats {
  driver: {
    id: string
    name: string
    phone: string
    email: string | null
    isActive: boolean
    joinedAt: string
  }
  stats: {
    revenue: number
    acceptedOrders: number
    deliveredOrders: number
    cancelledOrders: number
    pendingOrders?: number
    preparingOrders?: number
    readyOrders?: number
    deliveringOrders?: number
    averageOrderAmount: number
    totalDeliveries: number
    _debug?: {
      allDeliveredCount: number
      deliveredWithDate: number
      deliveredWithoutDate: number
    }
  }
  assignedZones: Array<{
    id: string
    name: string
    color: string
  }>
  period: string
}

export function DriverStatsModal({
  driverId,
  driverName,
  open,
  onOpenChange,
}: DriverStatsModalProps) {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<DriverStats | null>(null)
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("all")

  // Log quand le modal s'ouvre ou se ferme
  useEffect(() => {
    if (open) {
      console.log('🚪 Modal ouvert pour le livreur:', driverId)
      if (driverId) {
        console.log('🔄 Chargement des stats pour la période:', period)
        fetchDriverStats(period)
      } else {
        console.warn('⚠️ Aucun ID de livreur fourni à l\'ouverture du modal')
      }
    } else {
      console.log('🚪 Modal fermé, réinitialisation des états')
      setStats(null)
    }
    
    // Nettoyage lors du démontage
    return () => {
      console.log('🧹 Nettoyage du composant DriverStatsModal')
    }
  }, [open, driverId, period])
  
  // Log quand les stats changent
  useEffect(() => {
    // Log du rendu du composant
    console.log('🎨 Rendu du composant DriverStatsModal', {
      open,
      loading,
      hasStats: !!stats,
      driverId,
      period
    })

    if (!stats) {
      console.log('⏳ En attente des statistiques...')
      return
    }

    console.log('🔄 Mise à jour des statistiques:', {
      revenue: stats.stats.revenue,
      deliveredOrders: stats.stats.deliveredOrders,
      acceptedOrders: stats.stats.acceptedOrders,
      cancelledOrders: stats.stats.cancelledOrders,
      pendingOrders: stats.stats.pendingOrders,
      preparingOrders: stats.stats.preparingOrders,
      readyOrders: stats.stats.readyOrders,
      deliveringOrders: stats.stats.deliveringOrders,
      averageOrderAmount: stats.stats.averageOrderAmount,
      totalDeliveries: stats.stats.totalDeliveries,
      debug: stats.stats._debug,
    })
  }, [stats, open, loading, driverId, period])

  const fetchDriverStats = async (selectedPeriod: string) => {
    if (!driverId) {
      console.warn('❌ Aucun ID de livreur fourni')
      return
    }

    console.log(`🔍 Récupération des stats pour le livreur ${driverId}, période: ${selectedPeriod}`)
    setLoading(true)
    
    try {
      const url = `/api/delivery/driver-stats?driverId=${driverId}&period=${selectedPeriod}`
      console.log(`📡 Appel API: ${url}`)
      
      const response = await fetch(url)
      console.log(`📊 Réponse API status: ${response.status}`)
      
      const data = await response.json()
      console.log('📋 Données reçues (complètes):', JSON.stringify(data, null, 2))

      if (data.success && data.data) {
        console.log('✅ Données valides, mise à jour du state')
        console.log('📈 Stats détaillées:', {
          revenue: data.data.stats?.revenue,
          acceptedOrders: data.data.stats?.acceptedOrders,
          deliveredOrders: data.data.stats?.deliveredOrders,
          cancelledOrders: data.data.stats?.cancelledOrders,
          pendingOrders: data.data.stats?.pendingOrders,
          preparingOrders: data.data.stats?.preparingOrders,
          readyOrders: data.data.stats?.readyOrders,
          deliveringOrders: data.data.stats?.deliveringOrders,
          averageOrderAmount: data.data.stats?.averageOrderAmount,
          totalDeliveries: data.data.stats?.totalDeliveries,
          debug: data.data.stats?._debug,
        })
        setStats(data.data)
      } else {
        console.error('❌ API retourne success: false ou data manquante', {
          success: data.success,
          error: data.error,
          hasData: !!data.data,
        })
        setStats(null)
      }
    } catch (error) {
      console.error('💥 Erreur lors du chargement des stats:', error)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handlePeriodChange = (value: string) => {
    const newPeriod = value as "today" | "week" | "month" | "all"
    console.log(`🔄 Changement de période: ${period} → ${newPeriod}`)
    setPeriod(newPeriod)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Statistiques de {driverName}
          </DialogTitle>
          <DialogDescription>
            Détails des performances et statistiques du livreur
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Informations du livreur */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="text-sm font-medium">{stats.driver.phone}</p>
                </div>
              </div>
              {stats.driver.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">{stats.driver.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Membre depuis</p>
                  <p className="text-sm font-medium">
                    {formatDate(stats.driver.joinedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    stats.driver.isActive ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className="text-sm font-medium">
                    {stats.driver.isActive ? "Actif" : "Inactif"}
                  </p>
                </div>
              </div>
            </div>

            {/* Filtres de période */}
            <Tabs
              value={period}
              onValueChange={handlePeriodChange}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
                <TabsTrigger value="week">7 jours</TabsTrigger>
                <TabsTrigger value="month">30 jours</TabsTrigger>
                <TabsTrigger value="all">Tout</TabsTrigger>
              </TabsList>

              <TabsContent value={period} className="space-y-4 mt-4">
                {/* Statistiques principales */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Chiffre d'affaires */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Chiffre d'affaires
                        </p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                          {formatCurrency(stats.stats.revenue)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          En commissions sur les livraisons
                        </p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>

                  {/* Commandes acceptées */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Commandes acceptées
                        </p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          {stats.stats.acceptedOrders}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Confirmées ou en cours
                        </p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Commandes livrées */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Commandes livrées
                        </p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">
                          {stats.stats.deliveredOrders}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Livrées avec succès
                        </p>
                      </div>
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  {/* Commandes annulées */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-red-50 to-rose-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Commandes annulées
                        </p>
                        <p className="text-2xl font-bold text-red-600 mt-1">
                          {stats.stats.cancelledOrders}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Non abouties
                        </p>
                      </div>
                      <div className="p-2 bg-red-100 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistiques additionnelles */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-600">
                        Panier moyen
                      </p>
                    </div>
                    <p className="text-xl font-bold">
                      {formatCurrency(stats.stats.averageOrderAmount)}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-600">
                        Total livraisons
                      </p>
                    </div>
                    <p className="text-xl font-bold">
                      {stats.stats.totalDeliveries}
                    </p>
                  </div>
                </div>

                {/* Zones assignées */}
                {stats.assignedZones.length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-600">
                        Zones assignées
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stats.assignedZones.map((zone) => (
                        <Badge
                          key={zone.id}
                          variant="outline"
                          style={{
                            borderColor: zone.color,
                            backgroundColor: `${zone.color}15`,
                            color: zone.color,
                          }}
                        >
                          {zone.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Aucune donnée disponible
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

