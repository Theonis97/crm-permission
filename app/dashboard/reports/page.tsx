"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import ReportsSidebar from "@/components/reports/reports-sidebar"
import ReportsContent from "@/components/reports/reports-content"
import { toast } from "@/lib/app-toast"

export type Section = "overview" | "sales" | "products" | "customers" | "orders" | "drivers"

export default function ReportsPage() {
  const [currentSection, setCurrentSection] = useState<Section>("overview")
  const [period, setPeriod] = useState("month")
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    revenue: 0,
    revenueChange: 0,
    orders: 0,
    ordersChange: 0,
    customers: 0,
    customersChange: 0,
    products: 0,
    productsChange: 0,
    tasks: 0,
    tasksChange: 0,
    opportunities: 0,
    opportunitiesChange: 0,
  })
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reports/stats?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setTopProducts(data.topProducts || [])
        setRecentOrders(data.recentOrders || [])
      } else {
        toast.error("Erreur lors du chargement des statistiques")
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors du chargement des statistiques")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PermissionGuard permission="reports.view">
      <div className="flex h-screen bg-gray-50">
        <ReportsSidebar 
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
        />
        <ReportsContent
          currentSection={currentSection}
          period={period}
          onPeriodChange={setPeriod}
          isLoading={isLoading}
          stats={stats}
          topProducts={topProducts}
          recentOrders={recentOrders}
        />
      </div>
    </PermissionGuard>
  )
}
