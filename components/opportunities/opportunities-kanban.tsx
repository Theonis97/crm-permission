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
} from "lucide-react"

interface OpportunitiesKanbanProps {
  opportunities: Opportunity[]
  onRefresh: () => void
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
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
}: OpportunitiesKanbanProps) {
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null)

  // Auto-ouvrir le formulaire si aucune opportunité et permission de créer
  useEffect(() => {
    if (opportunities.length === 0 && canCreate) {
      setCreateSheetOpen(true)
    }
  }, [opportunities.length, canCreate])

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opportunités</h1>
            <p className="text-gray-600">
              {opportunities.length} opportunité{opportunities.length > 1 ? "s" : ""} au total
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle opportunité
            </Button>
          )}
        </div>

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
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {statusOpportunities.map((opportunity) => (
                    <Card
                      key={opportunity.id}
                      className={`cursor-move hover:shadow-md transition-shadow ${config.borderColor} border-l-4`}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, opportunity)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium line-clamp-2">{opportunity.title}</CardTitle>
                          {(canEdit || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Contact Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-gray-500" />
                            <span className="font-medium">
                              {opportunity.contact.firstName} {opportunity.contact.lastName}
                            </span>
                          </div>
                          {opportunity.contact.email && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{opportunity.contact.email}</span>
                            </div>
                          )}
                          {opportunity.contact.job && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Building className="h-3 w-3" />
                              <span className="truncate">{opportunity.contact.job}</span>
                            </div>
                          )}
                        </div>

                        {/* Owner */}
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(opportunity.owner.firstName, opportunity.owner.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-600">
                            {opportunity.owner.firstName} {opportunity.owner.lastName}
                          </span>
                        </div>

                        {/* Participants */}
                        {opportunity.participants.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-gray-500" />
                            <div className="flex -space-x-1">
                              {opportunity.participants.slice(0, 3).map((participant) => (
                                <Tooltip key={participant.id}>
                                  <TooltipTrigger>
                                    <Avatar className="h-5 w-5 border-2 border-white">
                                      <AvatarFallback className="text-xs">
                                        {getInitials(participant.user.firstName, participant.user.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {participant.user.firstName} {participant.user.lastName}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {opportunity.participants.length > 3 && (
                                <div className="h-5 w-5 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                  <span className="text-xs text-gray-600">+{opportunity.participants.length - 3}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            {opportunity._count && (
                              <>
                                {opportunity._count.tasks > 0 && (
                                  <div className="flex items-center gap-1">
                                    <CheckSquare className="h-3 w-3" />
                                    <span>{opportunity._count.tasks}</span>
                                  </div>
                                )}
                                {opportunity._count.invoices > 0 && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span>{opportunity._count.invoices}</span>
                                  </div>
                                )}
                                {opportunity._count.documents > 0 && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span>{opportunity._count.documents}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(opportunity.createdAt)}</span>
                          </div>
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
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
