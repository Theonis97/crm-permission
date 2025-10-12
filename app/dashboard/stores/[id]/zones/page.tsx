"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Map,
  Search,
  Plus,
  MapPin,
  Truck,
  Package,
  TrendingUp,
  Filter,
  Grid3X3,
  List,
  Navigation2,
  Circle,
  Edit,
  Trash2,
  Eye,
} from "lucide-react"
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

interface Zone {
  id: string
  name: string
  color: string
  drivers: number
  activeOrders: number
  completedToday: number
  coverage: string
  coordinates: { lat: number; lng: number }
}

interface Driver {
  id: string
  name: string
  zone: string
  lat: number
  lng: number
  status: "active" | "idle" | "delivering"
  avatar: string
  activeDeliveries: number
}

interface Order {
  id: string
  zone: string
  status: "pending" | "inProgress" | "delivered"
  customer: string
  amount: number
}

const gabonZones: Zone[] = [
  { 
    id: "1", 
    name: "Libreville Centre", 
    color: "#3B82F6", 
    drivers: 5, 
    activeOrders: 12, 
    completedToday: 45,
    coverage: "Centre-ville, Montagne Sainte, Louis",
    coordinates: { lat: 0.4162, lng: 9.4673 }
  },
  { 
    id: "2", 
    name: "Akanda", 
    color: "#10B981", 
    drivers: 3, 
    activeOrders: 8, 
    completedToday: 28,
    coverage: "Akanda, Zone industrielle, Nkok",
    coordinates: { lat: 0.5500, lng: 9.4500 }
  },
  { 
    id: "3", 
    name: "Owendo", 
    color: "#F59E0B", 
    drivers: 4, 
    activeOrders: 15, 
    completedToday: 52,
    coverage: "Port Môle, Zone commerciale",
    coordinates: { lat: 0.3000, lng: 9.5000 }
  },
  { 
    id: "4", 
    name: "Glass", 
    color: "#8B5CF6", 
    drivers: 2, 
    activeOrders: 6, 
    completedToday: 19,
    coverage: "Quartier Glass, Plein Ciel, Oloumi",
    coordinates: { lat: 0.4300, lng: 9.4800 }
  },
  { 
    id: "5", 
    name: "Nzeng-Ayong", 
    color: "#EC4899", 
    drivers: 3, 
    activeOrders: 10, 
    completedToday: 34,
    coverage: "PK8, PK9, PK10, Alibandeng",
    coordinates: { lat: 0.4500, lng: 9.5200 }
  },
]

const mockDrivers: Driver[] = [
  { id: "1", name: "Jacques Mballa", zone: "Libreville Centre", lat: 0.4162, lng: 9.4673, status: "delivering", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jacques", activeDeliveries: 3 },
  { id: "2", name: "Marie Ngono", zone: "Akanda", lat: 0.5500, lng: 9.4500, status: "active", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie", activeDeliveries: 0 },
  { id: "3", name: "Paul Etoa", zone: "Owendo", lat: 0.3000, lng: 9.5000, status: "delivering", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Paul", activeDeliveries: 2 },
  { id: "4", name: "Sophie Manga", zone: "Glass", lat: 0.4300, lng: 9.4800, status: "idle", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie", activeDeliveries: 0 },
  { id: "5", name: "Eric Onana", zone: "Nzeng-Ayong", lat: 0.4500, lng: 9.5200, status: "delivering", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eric", activeDeliveries: 1 },
]

const mockOrders: Order[] = [
  { id: "12345", zone: "Libreville Centre", status: "inProgress", customer: "Jean Dupont", amount: 25000 },
  { id: "12346", zone: "Libreville Centre", status: "pending", customer: "Marie Martin", amount: 35000 },
  { id: "12347", zone: "Akanda", status: "inProgress", customer: "Paul Bernard", amount: 18000 },
  { id: "12348", zone: "Owendo", status: "delivered", customer: "Sophie Laurent", amount: 42000 },
  { id: "12349", zone: "Glass", status: "pending", customer: "Alice Durand", amount: 15000 },
  { id: "12350", zone: "Nzeng-Ayong", status: "inProgress", customer: "Bob Martin", amount: 28000 },
]

export default function StoreZonesPage() {
  const params = useParams()
  const storeId = params.id as string
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZone, setSelectedZone] = useState<string>("all")
  const [mapCenter] = useState({ lat: 0.4162, lng: 9.4673 }) // Libreville

  const filteredZones = gabonZones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedZone === "all" || zone.id === selectedZone
    return matchesSearch && matchesFilter
  })

  const filteredDrivers = selectedZone === "all" 
    ? mockDrivers 
    : mockDrivers.filter(d => gabonZones.find(z => z.name === d.zone)?.id === selectedZone)

  const filteredOrders = selectedZone === "all"
    ? mockOrders
    : mockOrders.filter(o => gabonZones.find(z => z.name === o.zone)?.id === selectedZone)

  const totalDrivers = filteredZones.reduce((sum, zone) => sum + zone.drivers, 0)
  const totalActiveOrders = filteredZones.reduce((sum, zone) => sum + zone.activeOrders, 0)
  const totalCompletedToday = filteredZones.reduce((sum, zone) => sum + zone.completedToday, 0)

  // Créer les marqueurs pour la carte
  const createMapMarkers = () => {
    let markers = ''
    
    // Marqueurs pour les zones (centres)
    filteredZones.forEach((zone, index) => {
      markers += `&markers=color:${zone.color.replace('#', '0x')}%7Clabel:${index + 1}%7C${zone.coordinates.lat},${zone.coordinates.lng}`
    })
    
    return markers
  }

  return (
    <>
      <div className="border-b bg-white px-6 py-2.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Zones de Livraison</h1>
            <p className="text-gray-600">Cartographie et gestion des zones - Libreville, Gabon</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Vue */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "map"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Map className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle zone
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* Vue Map ou Liste */}
        {viewMode === "map" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Carte Interactive OpenStreetMap */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Carte Interactive - Libreville, Gabon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-[600px] rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="600"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=9.3,0.3,9.6,0.55&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lng}`}
                    style={{ border: 0 }}
                  ></iframe>
                  
                  {/* Overlay avec infos */}
                  <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                    <h4 className="font-semibold text-sm mb-2">Légende</h4>
                    <div className="space-y-2">
                      {filteredZones.map((zone) => (
                        <div key={zone.id} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                          <span className="font-medium">{zone.name}</span>
                          <span className="text-gray-500">({zone.drivers} livreurs)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats en temps réel */}
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>{filteredDrivers.filter(d => d.status === 'delivering').length} en livraison</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span>{filteredOrders.filter(o => o.status === 'inProgress').length} commandes actives</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lien vers carte complète */}
                <div className="mt-4 text-center">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${mapCenter.lat}&mlon=${mapCenter.lng}#map=12/${mapCenter.lat}/${mapCenter.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Navigation2 className="h-4 w-4" />
                    Ouvrir dans OpenStreetMap
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Panneau latéral - Activité en temps réel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Livreurs en Mouvement ({filteredDrivers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {filteredDrivers.map((driver) => (
                      <div key={driver.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={driver.avatar} />
                          <AvatarFallback>{driver.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{driver.name}</div>
                          <div className="text-xs text-gray-600">{driver.zone}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={
                            driver.status === 'delivering' ? 'bg-green-100 text-green-700' : 
                            driver.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {driver.status === 'delivering' ? 'En livraison' : 
                             driver.status === 'active' ? 'Disponible' : 'Repos'}
                          </Badge>
                          {driver.activeDeliveries > 0 && (
                            <span className="text-xs text-gray-500">{driver.activeDeliveries} commande(s)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Commandes Actives ({filteredOrders.filter(o => o.status !== 'delivered').length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {filteredOrders.filter(o => o.status !== 'delivered').map((order) => (
                      <div key={order.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">#{order.id}</span>
                          <Badge className={
                            order.status === 'inProgress' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }>
                            {order.status === 'inProgress' ? 'En cours' : 'En attente'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{order.customer}</div>
                        <div className="text-xs text-gray-500">{order.zone}</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">
                          {order.amount.toLocaleString()} FCFA
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Vue Liste */
          <Card>
            <CardHeader>
              <CardTitle>Liste des Zones de Livraison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Zone</TableHead>
                    <TableHead className="font-semibold">Couverture</TableHead>
                    <TableHead className="font-semibold">Livreurs</TableHead>
                    <TableHead className="font-semibold">En cours</TableHead>
                    <TableHead className="font-semibold">Livrées aujourd'hui</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredZones.map((zone) => (
                    <TableRow key={zone.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: zone.color }}
                          />
                          <div>
                            <div className="font-medium">{zone.name}</div>
                            <div className="text-sm text-gray-500">
                              {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lng.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">{zone.coverage}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold">
                          {zone.drivers} livreurs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-amber-600">{zone.activeOrders}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">{zone.completedToday}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
