"use client"

import { AccountingSidebar } from "@/components/accounting/accounting-sidebar"

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <AccountingSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
