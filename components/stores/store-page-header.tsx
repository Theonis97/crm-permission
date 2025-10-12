import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface StorePageHeaderProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
}

export function StorePageHeader({ title, description, action }: StorePageHeaderProps) {
  return (
    <div className="border-b bg-white px-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        {action && (
          <Button onClick={action.onClick}>
            {action.icon && <action.icon className="h-4 w-4 mr-2" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}