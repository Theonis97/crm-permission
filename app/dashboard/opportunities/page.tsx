"use client"

import { useState, useEffect } from "react"
import { OpportunitiesKanban } from "@/components/opportunities/opportunities-kanban"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { usePermissions } from "@/hooks/use-permissions"
import type { Opportunity } from "@/types/opportunities"
import { Loader2, Target, Trello } from "lucide-react"

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

  return (
    <PermissionGuard permissions={["opportunities.view", "opportunities.view_all"]}>
      <div className="h-full flex flex-col">
        <ModuleNavbar title="Opportunitées" description="Gerer vos opportunites d'affaires" icon={Trello}  />

        <div className="flex-1 p-6">
          <OpportunitiesKanban
            opportunities={opportunities}
            onRefresh={fetchOpportunities}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>
      </div>
    </PermissionGuard>
  )
}
