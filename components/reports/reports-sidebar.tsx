import { BarChart3, LayoutDashboard, TrendingUp, Package, Users, ShoppingCart, Truck } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Section } from "@/app/dashboard/reports/page"

interface ReportsSidebarProps {
  currentSection: Section
  onSectionChange: (section: Section) => void
}

export default function ReportsSidebar({ currentSection, onSectionChange }: ReportsSidebarProps) {
  const sections = [
    { id: "overview" as Section, label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: "sales" as Section, label: "Ventes", icon: TrendingUp },
    { id: "products" as Section, label: "Produits", icon: Package },
    { id: "customers" as Section, label: "Clients", icon: Users },
    { id: "orders" as Section, label: "Commandes", icon: ShoppingCart },
    { id: "drivers" as Section, label: "Livreurs", icon: Truck },
  ]

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-lg">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Rapports</h2>
            <p className="text-xs text-gray-600">Analytics & Statistiques</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = currentSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 font-medium",
                  isActive
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30 scale-[1.02]"
                    : "text-gray-700 hover:bg-gray-100 hover:scale-[1.01]"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-500")} />
                <span className="text-sm">{section.label}</span>
              </button>
            )
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center text-xs text-gray-500">
          <p className="font-medium">Période active</p>
          <p className="text-gray-400 mt-1">Ce mois</p>
        </div>
      </div>
    </aside>
  )
}
