"use client"

import { useState, useEffect } from "react"
import { PayrollSidebar } from "@/components/payroll/payroll-sidebar"
import { CreatePeriodModal } from "@/components/payroll/create-period-modal"
import { PayrollAccessGuard } from "@/components/payroll/payroll-access-guard"

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false)

  // Persist collapsed state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("payroll-sidebar-collapsed")
    if (saved !== null) {
      setCollapsed(saved === "true")
    }
  }, [])

  const handleToggle = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem("payroll-sidebar-collapsed", String(newState))
  }

  return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <PayrollSidebar 
          collapsed={collapsed} 
          onToggle={handleToggle}
          onCreatePeriod={() => setShowCreatePeriodModal(true)}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        
        {/* Create Period Modal */}
        <CreatePeriodModal
          open={showCreatePeriodModal}
          onOpenChange={setShowCreatePeriodModal}
        />
      </div>
  )
}
