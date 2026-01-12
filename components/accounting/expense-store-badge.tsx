"use client"

import { Badge } from "@/components/ui/badge"
import { Store, Building2 } from "lucide-react"

interface ExpenseStoreBadgeProps {
  store: { id: string; name: string } | null
  size?: "sm" | "md"
}

export function ExpenseStoreBadge({ store, size = "md" }: ExpenseStoreBadgeProps) {
  if (store) {
    return (
      <Badge 
        variant="outline" 
        className={`border-teal-300 bg-teal-50 text-teal-700 ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
      >
        <Store className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
        {store.name}
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className={`border-gray-300 bg-gray-50 text-gray-600 ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
    >
      <Building2 className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
      Général
    </Badge>
  )
}
