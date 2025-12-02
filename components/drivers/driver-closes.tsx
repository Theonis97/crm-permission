"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Loader2, 
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Eye
} from "lucide-react"

interface DriverClose {
  id: string
  closeDate: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  totalOrders: number
  totalRevenue: number
  totalCommission: number
  totalCash: number
  totalCard: number
  totalMobile: number
  notes: string | null
  createdAt: string
  approvedAt: string | null
  approvedBy: {
    id: string
    name: string
  } | null
}

interface DriverClosesData {
  closes: DriverClose[]
  summary: {
    totalCloses: number
    pendingCloses: number
    totalCommission: number
    lastCloseDate: string | null
  }
}

interface DriverClosesProps {
  driverId: string
  onViewClose?: (closeId: string) => void
}

export function DriverCloses({ driverId, onViewClose }: DriverClosesProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [closesData, setClosesData] = useState<DriverClosesData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCloses()
  }, [driverId])

  const loadCloses = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/delivery-persons/${driverId}/closes`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des clôtures")
      }
      const data = await response.json()
      setClosesData(data)
    } catch (err: any) {
      console.error("Error loading closes:", err)
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approuvée
          </Badge>
        )
      case "PENDING":
        return (
          <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejetée
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (!closesData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques des clôtures */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br py-0 from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <FileText className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Total clôtures</p>
                <p className="text-2xl font-bold text-blue-700">{closesData.summary.totalCloses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-200 rounded-lg">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-amber-600">En attente</p>
                <p className="text-2xl font-bold text-amber-700">{closesData.summary.pendingCloses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-green-600">Commission totale</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(closesData.summary.totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

     
        <div>
          {closesData.closes && closesData.closes.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Commandes</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closesData.closes.map((close) => (
                    <TableRow key={close.id}>
                      <TableCell className="font-medium">
                        {formatDate(close.closeDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {close.totalOrders}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(close.totalRevenue - close.totalCommission)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(close.totalCommission)}
                      </TableCell>
                 
                     
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune clôture enregistrée</p>
            </div>
          )}
        </div>
    </div>
  )
}
