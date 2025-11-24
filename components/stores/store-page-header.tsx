import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import { ReactNode } from "react"

interface StorePageHeaderProps {
  title: string
  description: string
  icon?: LucideIcon
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  actions?: ReactNode
}

export function StorePageHeader({ title, description, icon: Icon, action, actions }: StorePageHeaderProps) {
  return (
    <div className="border-b bg-white px-6 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6 text-gray-700" />}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}