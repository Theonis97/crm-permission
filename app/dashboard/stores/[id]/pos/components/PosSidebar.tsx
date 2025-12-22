import { 
  Receipt, 
  BarChart3, 
  Search, 
  Loader2, 
  Clock, 
  Check, 
  X, 
  MoreVertical,
  CheckCircle2,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface PosSidebarProps {
  subBoxOrders: any[]
  isLoadingSubBoxOrders: boolean
  subBoxOrderSearch: string
  setSubBoxOrderSearch: (value: string) => void
  loadSubBoxOrders: (search?: string) => void
  selectedSubBoxOrder: any
  loadSubBoxOrderToCart: (order: any) => void
  validateSubBoxOrder: (orderId: string) => void
  cancelSubBoxOrder: (orderId: string, reason?: string) => void
  dayCloseSummary: any
  handleDayClose: () => void
  isLoadingDayClose: boolean
  setShowKpiSheet: (show: boolean) => void
}

export function PosSidebar({
  subBoxOrders,
  isLoadingSubBoxOrders,
  subBoxOrderSearch,
  setSubBoxOrderSearch,
  loadSubBoxOrders,
  selectedSubBoxOrder,
  loadSubBoxOrderToCart,
  validateSubBoxOrder,
  cancelSubBoxOrder,
  dayCloseSummary,
  handleDayClose,
  isLoadingDayClose,
  setShowKpiSheet
}: PosSidebarProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  return (
    <div className="w-56 bg-white border-r flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">Sous-Caisses</h3>
              <p className="text-[10px] text-gray-500">{subBoxOrders.filter(order => order.status === "PENDING").length} en attente</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-orange-700 border-orange-200 bg-white hover:bg-orange-50"
            onClick={() => setShowKpiSheet(true)}
            title="KPI & Bonus"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Recherche par code client */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
          <Input
            type="text"
            placeholder="Code client..."
            value={subBoxOrderSearch}
            onChange={(e) => {
              setSubBoxOrderSearch(e.target.value)
              loadSubBoxOrders(e.target.value)
            }}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Liste des commandes */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoadingSubBoxOrders ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : subBoxOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">Aucune commande en attente</p>
          </div>
        ) : (
          subBoxOrders.map((order) => (
            <div
              key={order.id}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all hover:shadow-md group relative",
                selectedSubBoxOrder?.id === order.id
                  ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                  : "border-gray-200 hover:border-orange-300 bg-white"
              )}
            >
              {/* Zone cliquable principale pour charger la commande */}
              <div 
                className="cursor-pointer" 
                onClick={() => loadSubBoxOrderToCart(order)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-base text-gray-900">{order.clientCode}</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px]",
                      order.status === "PENDING" && "bg-amber-100 text-amber-700 border-amber-200",
                      order.status === "VALIDATED" && "bg-green-100 text-green-700 border-green-200",
                      order.status === "CANCELLED" && "bg-red-100 text-red-700 border-red-200"
                    )}
                  >
                    {order.status === "PENDING" && <Clock className="h-2.5 w-2.5 mr-1" />}
                    {order.status === "VALIDATED" && <Check className="h-2.5 w-2.5 mr-1" />}
                    {order.status === "CANCELLED" && <X className="h-2.5 w-2.5 mr-1" />}
                    {order.status === "PENDING" && "En attente"}
                    {order.status === "VALIDATED" && "Validée"}
                    {order.status === "CANCELLED" && "Annulée"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1">
                  <span>{order.subBox?.name || "Sous-caisse"}</span>
                  <span>•</span>
                  <span>{order.totalItems} article{order.totalItems > 1 ? "s" : ""}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-gray-900">
                      {((order.subtotal || 0) - (order.totalDiscount || 0)).toLocaleString()} F
                    </span>
                    {order.totalDiscount > 0 && (
                      <span className="text-[10px] text-red-500 line-through">
                        {order.subtotal?.toLocaleString()} F
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    {order.totalDiscount > 0 && (
                      <Badge variant="outline" className="text-[9px] bg-red-50 text-red-600 border-red-100 py-0 h-4 mb-1">
                        -{order.totalDiscount?.toLocaleString()} F
                      </Badge>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu déroulant 3 points - uniquement pour les commandes en attente */}
               {order.status === "PENDING" && (
                 <DropdownMenu open={openDropdownId === order.id} onOpenChange={(open) => setOpenDropdownId(open ? order.id : null)}>
                   <DropdownMenuTrigger asChild>
                     <button
                       className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                       onClick={(e) => e.stopPropagation()}
                     >
                       <MoreVertical className="h-4 w-4 text-gray-500" />
                     </button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-48">
                     <DropdownMenuItem
                       onClick={(e) => {
                         e.stopPropagation()
                         validateSubBoxOrder(order.id)
                         setOpenDropdownId(null)
                       }}
                       className="flex items-center gap-2 text-green-600"
                     >
                       <Check className="h-4 w-4" />
                       Déjà vendu
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={(e) => {
                         e.stopPropagation()
                         cancelSubBoxOrder(order.id, "Annulée depuis le POS")
                         setOpenDropdownId(null)
                       }}
                       className="flex items-center gap-2 text-red-600"
                     >
                       <X className="h-4 w-4" />
                       Annuler la commande
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               )}
            </div>
          ))
        )}
      </div>

      {/* Footer - Clôture de journée */}
      <div className="p-2 border-t space-y-2">
        <button
          onClick={() => setShowKpiSheet(true)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
        >
          <BarChart3 className="h-4 w-4" />
          Performance & Bonus
        </button>

        <button
          onClick={handleDayClose}
          disabled={isLoadingDayClose}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-xs font-medium",
            dayCloseSummary?.isAlreadyClosed
              ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
              : "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200"
          )}
        >
          {isLoadingDayClose ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : dayCloseSummary?.isAlreadyClosed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          {dayCloseSummary?.isAlreadyClosed ? "Mettre à jour" : "Clôturer la journée"}
        </button>
      </div>
    </div>
  )
}
