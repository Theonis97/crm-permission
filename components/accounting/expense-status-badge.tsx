"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertCircle } from "lucide-react"

interface ExpenseStatusBadgeProps {
  status: "PENDING" | "PARTIALLY_PAID" | "PAID"
  size?: "sm" | "md"
}

const statusConfig = {
  PENDING: {
    label: "En attente",
    variant: "outline" as const,
    className: "border-orange-300 bg-orange-50 text-orange-700",
    icon: Clock,
  },
  PARTIALLY_PAID: {
    label: "Partiel",
    variant: "outline" as const,
    className: "border-blue-300 bg-blue-50 text-blue-700",
    icon: AlertCircle,
  },
  PAID: {
    label: "Payée",
    variant: "outline" as const,
    className: "border-green-300 bg-green-50 text-green-700",
    icon: CheckCircle,
  },
}

export function ExpenseStatusBadge({ status, size = "md" }: ExpenseStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
      {config.label}
    </Badge>
  )
}
