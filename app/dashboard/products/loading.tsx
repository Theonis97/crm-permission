import { Package } from "lucide-react"
import { ModuleNavbar } from "@/components/navigation/module-navbar"

export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
