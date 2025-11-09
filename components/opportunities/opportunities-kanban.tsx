"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CreateOpportunitySheet } from "./create-opportunity-sheet"
import { EditOpportunitySheet } from "./edit-opportunity-sheet"
import { DeleteOpportunityDialog } from "./delete-opportunity-dialog"
import { OpportunityDetailModal } from "./opportunity-detail-modal"
import type { Opportunity, OpportunityStatus } from "@/types/opportunities"
import {
  Plus,
  MoreHorizontal,
  User,
  Users,
  FileText,
  CheckSquare,
  Calendar,
  Mail,
  Building,
  Edit,
  Trash2,
  Euro,
} from "lucide-react"

interface OpportunitiesKanbanProps {
  opportunities: Opportunity[]
  onRefresh: () => void
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  createSheetOpen: boolean
  setCreateSheetOpen: (open: boolean) => void
}

const statusConfig = {
  NEW: {
    label: "Nouvelles",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  WON: {
    label: "Gagnées",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  LOST: {
    label: "Perdues",
    color: "bg-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
}

export function OpportunitiesKanban({
  opportunities,
  onRefresh,
  canCreate,
  canEdit,
  canDelete,
  createSheetOpen,
  setCreateSheetOpen,
}: OpportunitiesKanbanProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null)

  // Suppression de l'auto-ouverture du formulaire
  // useEffect(() => {
  //   if (opportunities.length === 0 && canCreate) {
  //     setCreateSheetOpen(true)
  //   }
  // }, [opportunities.length, canCreate])

  const handleStatusChange = async (opportunityId: string, newStatus: OpportunityStatus) => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error)
    }
  }

  const handleDragStart = (e: React.DragEvent, opportunity: Opportunity) => {
    setDraggedOpportunity(opportunity)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, newStatus: OpportunityStatus) => {
    e.preventDefault()
    if (draggedOpportunity && draggedOpportunity.status !== newStatus && canEdit) {
      handleStatusChange(draggedOpportunity.id, newStatus)
    }
    setDraggedOpportunity(null)
  }

  const getOpportunitiesByStatus = (status: OpportunityStatus) => {
    return opportunities.filter((opp) => opp.status === status)
  }

  const getAmountByStatus = (status: OpportunityStatus) => {
    const statusOpportunities = getOpportunitiesByStatus(status)
    if (status === 'WON') {
      return statusOpportunities.reduce((sum, opp) => sum + (opp.finalAmount || opp.globalAmount || 0), 0)
    }
    return statusOpportunities.reduce((sum, opp) => sum + (opp.globalAmount || 0), 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  }

  const formatAmount = (amount: number | null) => {
    if (!amount) return null
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Kanban Board */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-auto">
          {(Object.keys(statusConfig) as OpportunityStatus[]).map((status) => {
            const config = statusConfig[status]
            const statusOpportunities = getOpportunitiesByStatus(status)

            return (
              <div
                key={status}
                className={`flex flex-col ${config.bgColor} rounded-lg p-4 min-h-0`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                    <h3 className="font-semibold text-gray-900">{config.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {statusOpportunities.length}
                    </Badge>
                  </div>
                  {getAmountByStatus(status) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Euro className="h-3 w-3" />
                      <span className="font-medium">{formatAmount(getAmountByStatus(status))}</span>
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {statusOpportunities.map((opportunity) => (
                    <Card
                      key={opportunity.id}
                      className="group cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, opportunity)}
                      onClick={() => {
                        setSelectedOpportunity(opportunity)
                        setDetailModalOpen(true)
                      }}
                    >
                      <CardContent className="px-4 py-0">
                        <div className="flex items-start justify-between mb-3 pt-4">
                          {/* Titre */}
                          <div className="flex-1 pr-2">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">
                              {opportunity.title}
                            </h3>
                          </div>
                          
                          {/* Menu actions */}
                          {(canEdit || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEdit && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOpportunity(opportunity)
                                      setEditSheetOpen(true)
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOpportunity(opportunity)
                                      setDeleteDialogOpen(true)
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        {/* Montant - Plus grand avec arrière-plan */}
                        <div className="mb-4">
                          {(opportunity.finalAmount || opportunity.globalAmount) && (
                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                              <div className="text-2xl font-bold text-green-600">
                                {formatAmount(opportunity.globalAmount)}
                              </div>
                              {opportunity.finalAmount && opportunity.globalAmount && opportunity.finalAmount !== opportunity.globalAmount && (
                                <div className="text-sm text-gray-500 mt-1">
                                  Négocié : {formatAmount(opportunity.finalAmount)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Client avec avatar et tooltip */}
                        <div className="flex items-center justify-between pb-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-pointer">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
                                    {getInitials(opportunity.contact.firstName, opportunity.contact.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {opportunity.contact.firstName} {opportunity.contact.lastName}
                                </p>
                                {opportunity.contact.email && (
                                  <p className="text-xs text-gray-600">{opportunity.contact.email}</p>
                                )}
                                {opportunity.contact.job && (
                                  <p className="text-xs text-gray-600">{opportunity.contact.job}</p>
                                )}
                                {opportunity.contact.phone && (
                                  <p className="text-xs text-gray-600">{opportunity.contact.phone}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {statusOpportunities.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">Aucune opportunité</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sheets and Dialogs */}
        <CreateOpportunitySheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} onSuccess={onRefresh} />

        {selectedOpportunity && (
          <>
            <EditOpportunitySheet
              open={editSheetOpen}
              onOpenChange={setEditSheetOpen}
              opportunity={selectedOpportunity}
              onSuccess={onRefresh}
            />

            <DeleteOpportunityDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              opportunity={selectedOpportunity}
              onSuccess={onRefresh}
            />

            {/* Modale de détail */}
            <OpportunityDetailModal
              opportunity={selectedOpportunity}
              open={detailModalOpen}
              onOpenChange={setDetailModalOpen}
              onRefresh={onRefresh}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
