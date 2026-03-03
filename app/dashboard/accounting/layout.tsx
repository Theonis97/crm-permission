"use client"

import { AccountingSidebar } from "@/components/accounting/accounting-sidebar"
import { AccountingAccessGuard } from "@/components/accounting/accounting-access-guard"

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AccountingAccessGuard>
      <div className="flex h-screen bg-gray-50">
        <AccountingSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AccountingAccessGuard>
  )
}
