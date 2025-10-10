"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StorePageHeader } from "@/components/stores/store-page-header"
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Package,
  CheckCircle2,
} from "lucide-react"

interface DriversPageProps {
  params: {
    id: string
  }
}

const mockDrivers = [
  {
    id: "1",
    name: "Jacques Mballa",
    phone: "+237 6XX XXX 111",
    email: "jacques.mballa@email.com",
    vehicle: "Moto Yamaha",
    plateNumber: "DLA-1234-AB",
    status: "available",
    activeDeliveries: 0,
    totalDeliveries: 156,
    rating: 4.8,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jacques",
  },
  {
    id: "2",
    name: "Paul Etoa",
    phone: "+237 6XX XXX 222",
    email: "paul.etoa@email.com",
    vehicle: "Voiture Toyota",
    plateNumber: "DLA-5678-CD",
    status: "busy",
    activeDeliveries: 3,
    totalDeliveries: 203,
    rating: 4.9,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Paul",
  },
  {
    id: "3",
    name: "Marie Ngono",
    phone: "+237 6XX XXX 333",
    email: "marie.ngono@email.com",
    vehicle: "Moto Honda",
    plateNumber: "DLA-9012-EF",
    status: "available",
    activeDeliveries: 0,
    totalDeliveries: 189,
    rating: 4.7,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie",
  },
  {
    id: "4",
    name: "Eric Onana",
    phone: "+237 6XX XXX 444",
    email: "eric.onana@email.com",
    vehicle: "Moto Suzuki",
    plateNumber: "DLA-3456-GH",
    status: "busy",
    activeDeliveries: 2,
    totalDeliveries: 178,
    rating: 4.6,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eric",
  },
  {
    id: "5",
    name: "Sophie Manga",
    phone: "+237 6XX XXX 555",
    email: "sophie.manga@email.com",
    vehicle: "Voiture Hyundai",
    plateNumber: "DLA-7890-IJ",
    status: "offline",
    activeDeliveries: 0,
    totalDeliveries: 142,
    rating: 4.5,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  },
  {
    id: "6",
    name: "David Nkolo",
    phone: "+237 6XX XXX 666",
    email: "david.nkolo@email.com",
    vehicle: "Moto Kawasaki",
    plateNumber: "DLA-2345-KL",
    status: "available",
    activeDeliveries: 0,
    totalDeliveries: 167,
    rating: 4.8,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "available":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Disponible</Badge>
    case "busy":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En livraison</Badge>
    case "offline":
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Hors ligne</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function DriversPage({ params }: DriversPageProps) {
  const availableDrivers = mockDrivers.filter(d => d.status === "available")
  const busyDrivers = mockDrivers.filter(d => d.status === "busy")
  const offlineDrivers = mockDrivers.filter(d => d.status === "offline")

  return (
    <>
      <StorePageHeader
        title="Livreurs"
        description="Gérer l'équipe de livraison"
        action={{
          label: "Ajouter un livreur",
          onClick: () => {},
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Livreurs</CardTitle>
            <Truck className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockDrivers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Disponibles</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableDrivers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En livraison</CardTitle>
            <Truck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{busyDrivers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Livraisons actives</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {mockDrivers.reduce((sum, d) => sum + d.activeDeliveries, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Rechercher un livreur..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des livreurs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockDrivers.map((driver) => (
          <Card key={driver.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={driver.avatar} alt={driver.name} />
                  <AvatarFallback className="text-lg font-semibold">
                    {driver.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                    {getStatusBadge(driver.status)}
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
                      <span>{driver.vehicle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      <span>{driver.plateNumber}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-600">Livraisons: </span>
                        <span className="font-semibold text-gray-900">{driver.totalDeliveries}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Note: </span>
                        <span className="font-semibold text-amber-600">⭐ {driver.rating}</span>
                      </div>
                    </div>
                    {driver.activeDeliveries > 0 && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {driver.activeDeliveries} livraison(s) en cours
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </>
  )
}
