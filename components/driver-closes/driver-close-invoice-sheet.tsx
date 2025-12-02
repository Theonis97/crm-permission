"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Truck,
  Calendar,
  User,
  MapPin,
  Phone,
  Receipt,
  Package,
  DollarSign,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Printer,
  Download
} from "lucide-react"
import { formatFCFA } from "@/lib/utils"

interface DriverCloseDetail {
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

interface DriverCloseInvoiceSheetProps {
  isOpen: boolean
  onClose: () => void
  driverClose: DriverCloseDetail | null
  storeName?: string
}

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'CASH':
      return <Banknote className="h-4 w-4" />
    case 'CARD':
      return <CreditCard className="h-4 w-4" />
    case 'MOBILE':
      return <Smartphone className="h-4 w-4" />
    default:
      return <DollarSign className="h-4 w-4" />
  }
}

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'CASH':
      return 'Espèces'
    case 'CARD':
      return 'Carte'
    case 'MOBILE':
      return 'Mobile Money'
    default:
      return method
  }
}

export function DriverCloseInvoiceSheet({
  isOpen,
  onClose,
  driverClose,
  storeName
}: DriverCloseInvoiceSheetProps) {
  if (!driverClose) return null

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    // TODO: Implémenter l'export PDF
    console.log("Export PDF à implémenter")
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[900px] flex flex-col h-full p-0">
        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header avec nom du livreur et date */}
          <SheetHeader className="pb-6">
            <SheetTitle className="text-3xl font-bold text-gray-900">
              {driverClose.driver.name}
            </SheetTitle>
            <SheetDescription className="text-lg text-gray-600">
              Clôture du {new Date(driverClose.closeDate).toLocaleDateString('fr-FR')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Card avec les chiffres globaux */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-3xl font-bold text-blue-600">{formatFCFA(driverClose.totalRevenue - driverClose.totalCommission)}</div>
                  <div className="text-sm text-gray-500 mt-1">Chiffre d'Affaires</div>
                </div>
                <div className="w-px h-16 bg-gray-300"></div>
                <div className="text-center flex-1">
                  <div className="text-3xl font-bold text-gray-900">{driverClose.totalOrders}</div>
                  <div className="text-sm text-gray-500 mt-1">Commandes</div>
                </div>
                <div className="w-px h-16 bg-gray-300"></div>
                <div className="text-center flex-1">
                  <div className="text-3xl font-bold text-green-600">{formatFCFA(driverClose.totalCommission)}</div>
                  <div className="text-sm text-gray-500 mt-1">Commission</div>
                </div>
              </div>
            </div>

            {/* Tableau des commandes */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">ID Commande</TableHead>
                    <TableHead className="font-semibold text-center">Nombre de Produits</TableHead>
                    <TableHead className="font-semibold text-right">Montant Commande</TableHead>
                    <TableHead className="font-semibold text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverClose.deliveries.map((delivery) => {
                    // Montant commande = valeur commande - commission
                    const montantCommande = delivery.orderValue - delivery.commission
                    return (
                      <TableRow key={delivery.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          #{delivery.orderNumber}
                        </TableCell>
                        <TableCell className="text-center">
                          {delivery.items.length}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatFCFA(montantCommande)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatFCFA(delivery.commission)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* Ligne de total */}
                  <TableRow className="bg-gray-100 border-t-2 border-gray-300">
                    <TableCell className="font-bold text-gray-900" colSpan={2}>
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {formatFCFA(driverClose.totalRevenue - driverClose.totalCommission)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatFCFA(driverClose.totalCommission)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Boutons d'actions fixes en bas du sheet */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={handlePrint} className="flex items-center justify-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={handleExport} className="flex items-center justify-center gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
