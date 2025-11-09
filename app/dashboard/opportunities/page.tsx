"use client"

import { useState, useEffect } from "react"
import { OpportunitiesKanban } from "@/components/opportunities/opportunities-kanban"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { usePermissions } from "@/hooks/use-permissions"
import type { Opportunity } from "@/types/opportunities"
import { Loader2, Target, Trello, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const opportunityNavItems = [
  {
    title: "Vue d'ensemble",
    href: "/dashboard/opportunities",
    icon: Target,
  },
]

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const { hasPermission } = usePermissions()

  const canView = hasPermission("opportunities.view") || hasPermission("opportunities.view_all")
  const canCreate = hasPermission("opportunities.create")
  const canEdit = hasPermission("opportunities.edit")
  const canDelete = hasPermission("opportunities.delete")

  const fetchOpportunities = async () => {
    try {
      const response = await fetch("/api/opportunities")
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.opportunities || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des opportunités:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) {
      fetchOpportunities()
    } else {
      setLoading(false)
    }
  }, [canView])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Statistiques par statut
  const stats = {
    new: {
      count: opportunities.filter(o => o.status === 'NEW').length,
      amount: opportunities.filter(o => o.status === 'NEW').reduce((sum, o) => sum + (o.globalAmount || 0), 0)
    },
    inProgress: {
      count: opportunities.filter(o => o.status === 'IN_PROGRESS').length,
      amount: opportunities.filter(o => o.status === 'IN_PROGRESS').reduce((sum, o) => sum + (o.globalAmount || 0), 0)
    },
    won: {
      count: opportunities.filter(o => o.status === 'WON').length,
      amount: opportunities.filter(o => o.status === 'WON').reduce((sum, o) => sum + (o.finalAmount || o.globalAmount || 0), 0)
    },
    lost: {
      count: opportunities.filter(o => o.status === 'LOST').length,
      amount: opportunities.filter(o => o.status === 'LOST').reduce((sum, o) => sum + (o.globalAmount || 0), 0)
    },
    total: {
      count: opportunities.length,
      amount: opportunities.reduce((sum, o) => sum + (o.globalAmount || 0), 0)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <PermissionGuard permissions={["opportunities.view", "opportunities.view_all"]}>
      <div className="h-full flex flex-col">
        <ModuleNavbar 
          title="Opportunités" 
          description="Gérer vos opportunités d'affaires" 
          icon={Trello}
          primaryAction={canCreate ? {
            label: "Nouvelle opportunité",
            onClick: () => setCreateSheetOpen(true),
            icon: Plus
          } : undefined}
        >
          {/* Statistiques centrées */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {stats.new.count} Nouvelles
                {stats.new.amount > 0 && (
                  <span className="ml-1 text-xs font-normal">• {formatAmount(stats.new.amount)}</span>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {stats.inProgress.count} En cours
                {stats.inProgress.amount > 0 && (
                  <span className="ml-1 text-xs font-normal">• {formatAmount(stats.inProgress.amount)}</span>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {stats.won.count} Gagnées
                {stats.won.amount > 0 && (
                  <span className="ml-1 text-xs font-normal">• {formatAmount(stats.won.amount)}</span>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {stats.lost.count} Perdues
                {stats.lost.amount > 0 && (
                  <span className="ml-1 text-xs font-normal">• {formatAmount(stats.lost.amount)}</span>
                )}
              </Badge>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {stats.total.count} Total
                {stats.total.amount > 0 && (
                  <span className="ml-1 text-xs font-normal">• {formatAmount(stats.total.amount)}</span>
                )}
              </Badge>
            </div>
          </div>
        </ModuleNavbar>

        <div className="flex-1 p-6">
          <OpportunitiesKanban
            opportunities={opportunities}
            onRefresh={fetchOpportunities}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            createSheetOpen={createSheetOpen}
            setCreateSheetOpen={setCreateSheetOpen}
          />
        </div>
      </div>
    </PermissionGuard>
  )
}
