"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Package,
  CheckCircle2,
  Grid3X3,
  List,
  Star,
} from "lucide-react"
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

interface DriversPageProps {
  params: Promise<{
    id: string
  }>
}

const mockDrivers = [
  {
    id: "1",
    name: "Jacques Mballa",
    phone: "+241 0X XX XX 111",
    email: "jacques.mballa@email.com",
    vehicle: "Moto Yamaha",
    plateNumber: "LBV-1234-AB",
    status: "available",
    activeDeliveries: 0,
    totalDeliveries: 156,
    rating: 4.8,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jacques",
  },
  {
    id: "2",
    name: "Paul Etoa",
    phone: "+241 0X XX XX 222",
    email: "paul.etoa@email.com",
    vehicle: "Voiture Toyota",
    plateNumber: "LBV-5678-CD",
    status: "busy",
    activeDeliveries: 3,
    totalDeliveries: 203,
    rating: 4.9,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Paul",
  },
  {
    id: "3",
    name: "Marie Ngono",
    phone: "+241 0X XX XX 333",
    email: "marie.ngono@email.com",
    vehicle: "Moto Honda",
    plateNumber: "LBV-9012-EF",
    status: "available",
    activeDeliveries: 0,
    totalDeliveries: 189,
    rating: 4.7,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie",
  },
  {
    id: "4",
    name: "Eric Onana",
    phone: "+241 0X XX XX 444",
    email: "eric.onana@email.com",
    vehicle: "Moto Suzuki",
    plateNumber: "LBV-3456-GH",
    status: "busy",
    activeDeliveries: 2,
    totalDeliveries: 178,
    rating: 4.6,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eric",
  },
  {
    id: "5",
    name: "Sophie Manga",
    phone: "+241 0X XX XX 555",
    email: "sophie.manga@email.com",
    vehicle: "Voiture Hyundai",
    plateNumber: "LBV-7890-IJ",
    status: "offline",
    activeDeliveries: 0,
    totalDeliveries: 142,
    rating: 4.5,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  },
  {
    id: "6",
    name: "David Nkolo",
    phone: "+241 0X XX XX 666",
    email: "david.nkolo@email.com",
    vehicle: "Moto Kawasaki",
    plateNumber: "LBV-2345-KL",
    status: "available",
    activeDeliveries: 0,
    totalDeliveries: 167,
    rating: 4.8,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
]

export default function DriversPage({ params }: DriversPageProps) {
  const router = useRouter()
  const { id: storeId } = use(params)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredDrivers = mockDrivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.phone.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getDriverInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  const handleViewDriver = (driverId: string) => {
    router.push(`/dashboard/stores/${storeId}/drivers/${driverId}`)
  }

  return (
    <>
      <div className="border-b bg-white px-6 py-2.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Livreurs</h1>
            <p className="text-gray-600">Gestion de l'équipe de livraison</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Vue */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <Button className="bg-blue-900 hover:bg-blue-900 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un livreur
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Filtres et recherche */}
        <Card className="gap-0">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, email, téléphone..."
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="busy">En livraison</SelectItem>
                    <SelectItem value="offline">Hors ligne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {viewMode === "grid" ? (
              <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDrivers.map((driver) => (
                  <Card 
                    key={driver.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewDriver(driver.id)}
                  >
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={driver.avatar} alt={driver.name} />
                          <AvatarFallback>{getDriverInitials(driver.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                            {driver.status === 'available' ? (
                              <Badge className="bg-green-100 text-green-700">Disponible</Badge>
                            ) : driver.status === 'busy' ? (
                              <Badge className="bg-amber-100 text-amber-700">En livraison</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700">Hors ligne</Badge>
                            )}
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span>{driver.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{driver.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Truck className="h-3 w-3" />
                              <span>{driver.vehicle} - {driver.plateNumber}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="text-gray-600">{driver.totalDeliveries} livraisons</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="font-semibold text-gray-900">{driver.rating}</span>
                              </div>
                            </div>
                            {driver.activeDeliveries > 0 && (
                              <div className="mt-2 text-xs text-amber-600 font-medium">
                                {driver.activeDeliveries} livraison(s) en cours
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Livreur</TableHead>
                      <TableHead className="font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold">Contact</TableHead>
                      <TableHead className="font-semibold">Véhicule</TableHead>
                      <TableHead className="font-semibold">Livraisons</TableHead>
                      <TableHead className="font-semibold">Note</TableHead>
                      <TableHead className="font-semibold">En cours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow 
                      key={driver.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDriver(driver.id)}
                    >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={driver.avatar} />
                              <AvatarFallback>{getDriverInitials(driver.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{driver.name}</div>
                              <div className="text-sm text-gray-500">{driver.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.status === 'available' ? (
                            <Badge className="bg-green-100 text-green-700">Disponible</Badge>
                          ) : driver.status === 'busy' ? (
                            <Badge className="bg-amber-100 text-amber-700">En livraison</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">Hors ligne</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{driver.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{driver.vehicle}</div>
                            <div className="text-gray-500">{driver.plateNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{driver.totalDeliveries}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-semibold">{driver.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.activeDeliveries > 0 ? (
                            <Badge variant="outline" className="text-amber-600">
                              {driver.activeDeliveries}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
