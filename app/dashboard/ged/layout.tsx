"use client"

import { GedSidebar } from "@/components/ged/ged-sidebar"

export default function GedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <GedSidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
