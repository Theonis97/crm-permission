"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Loader2,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  Receipt,
} from "lucide-react"

export interface DriverDeclarationCloseRow {
  id: string
  closeDate: string
  declarationCount: number
  totalCollected: number
  totalToDeposit: number
  totalDeliveryFees: number
  lastDeclaredAt: string
}

interface DriverClosesData {
  closes: DriverDeclarationCloseRow[]
  summary: {
    totalDays: number
    totalDeclarations: number
    totalCollectedAll: number
    totalToDepositAll: number
    lastCloseDate: string | null
  }
}

interface DriverClosesProps {
  driverId: string
}

function formatBusinessDateKeyFr(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function DriverCloses({ driverId }: DriverClosesProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [closesData, setClosesData] = useState<DriverClosesData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadCloses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/delivery-persons/${driverId}/closes`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des clôtures")
      }
      const data = await response.json()
      setClosesData(data)
    } catch (err: unknown) {
      console.error("Error loading closes:", err)
      setError(err instanceof Error ? err.message : "Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }, [driverId])

  useEffect(() => {
    void loadCloses()
  }, [loadCloses])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA"
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
      <p className="text-sm text-muted-foreground">
        Synthèse par <strong>jour des ventes déclarées</strong> (fuseau entreprise).{" "}
        <strong>À déposer</strong> = montant net dû au magasin après vos règles de livraison (identique au
        « Net » sur chaque déclaration).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br py-0 from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Jours déclarés</p>
                <p className="text-2xl font-bold text-blue-700">{closesData.summary.totalDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-violet-50 to-violet-100 border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-200 rounded-lg">
                <Receipt className="h-5 w-5 text-violet-700" />
              </div>
              <div>
                <p className="text-sm text-violet-600">Déclarations (lignes)</p>
                <p className="text-2xl font-bold text-violet-700">{closesData.summary.totalDeclarations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-200 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-emerald-600">Total à déposer (période)</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(closesData.summary.totalToDepositAll)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {closesData.closes && closesData.closes.length > 0 ? (
          <ScrollArea className="h-[420px] sm:h-[480px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date (jour métier)</TableHead>
                  <TableHead className="text-center">Décl.</TableHead>
                  <TableHead className="text-right">Encaissé</TableHead>
                  <TableHead className="text-right font-semibold">À déposer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closesData.closes.map((close) => (
                  <TableRow key={close.id}>
                    <TableCell className="font-medium">
                      {formatBusinessDateKeyFr(close.closeDate)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{close.declarationCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(close.totalCollected)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(close.totalToDeposit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune déclaration de vente enregistrée</p>
          </div>
        )}
      </div>
    </div>
  )
}
