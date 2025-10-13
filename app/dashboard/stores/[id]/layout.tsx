"use client"

import { useState, useEffect, use } from "react"
import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  ShoppingBag,
  Users,
  Package,
  FolderTree,
  Tag,
  TrendingUp,
  Truck,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Plus,
  LayoutGrid,
  Menu,
  X,
  ChevronRightIcon,
  ChevronLeft,
  Calculator,
  ChevronRight,
  Grid3x3,
  User,
  Map,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StoreLayoutProps {
  children: React.ReactNode
  params: Promise<{
    id: string
  }>
}

interface Store {
  id: string
  name: string
  logo: string | null
  coverImage: string | null
  address: string | null
  phone: string | null
  email: string | null
  isActive: boolean
}

const overviewItem = { icon: Home, label: "Vue d'ensemble", href: "" }

const catalogueItems = [
  { icon: Package, label: "Produits", href: "/products" },
  { icon: FolderTree, label: "Catégories", href: "/categories" },
  { icon: Tag, label: "Marques", href: "/brands" },
]

const menuItems = [
  { icon: Package, label: "Commandes", href: "/orders" },
  { icon: Calculator, label: "Caisse", href: "/pos" },
  { icon: Users, label: "Contacts", href: "/contacts" },
  { icon: Truck, label: "Livreurs", href: "/drivers" },
  { icon: Map, label: "Zones", href: "/zones" },
  { icon: TrendingUp, label: "Mouvements", href: "/movements" },
]

export default function StoreLayout({ children, params }: StoreLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { id } = use(params)
  const { data: session } = useSession()
  const [stores, setStores] = useState<Store[]>([])
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)

  // Récupérer la liste des magasins
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch("/api/stores")
        if (!response.ok) throw new Error("Erreur lors du chargement des magasins")
        const data = await response.json()
        setStores(data)
      } catch (error) {
        console.error("Error fetching stores:", error)
        toast.error("Erreur lors du chargement des magasins")
      }
    }
    fetchStores()
  }, [])

  // Récupérer le magasin actuel
  useEffect(() => {
    const fetchCurrentStore = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/stores/${id}`)
        if (!response.ok) throw new Error("Erreur lors du chargement du magasin")
        const data = await response.json()
        setCurrentStore(data)
      } catch (error) {
        console.error("Error fetching current store:", error)
        toast.error("Erreur lors du chargement du magasin")
      } finally {
        setLoading(false)
      }
    }
    fetchCurrentStore()
  }, [id])

  const handleStoreChange = (storeId: string) => {
    router.push(`/dashboard/stores/${storeId}`)
  }

  const isActive = (href: string) => {
    const basePath = `/dashboard/stores/${id}`
    if (href === "") {
      return pathname === basePath
    }
    return pathname.startsWith(`${basePath}${href}`)
  }

  const isCatalogueActive = catalogueItems.some(item => isActive(item.href))

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Store Selector with Collapse Button */}
        <div className={cn("px-4 py-2 border-b border-gray-200 relative", sidebarCollapsed && "hidden")}>
          {loading || !currentStore ? (
            <div className="flex items-center gap-3 p-2">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
              </div>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto bg-gray-100 rounded-full">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={currentStore.logo || undefined} alt={currentStore.name} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {currentStore.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{currentStore.name}</p>
                      <p className="text-xs text-gray-500">Magasin</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Mes Magasins</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stores.map((store) => (
                  <DropdownMenuItem
                    key={store.id}
                    onClick={() => handleStoreChange(store.id)}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={store.logo || undefined} alt={store.name} />
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {store.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{store.name}</span>
                    {store.id === currentStore.id && (
                      <div className="h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard/stores/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un magasin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Collapse Button - Positioned absolutely on the right */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-6 -right-3 h-5 w-5 p-0 hover:bg-gray-100"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Collapsed State - Show only collapse button */}
        {sidebarCollapsed && (
          <div className="p-3 border-b border-gray-200 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Vue d'ensemble */}
          <Button
            variant="ghost"
            className={cn(
              "w-full font-normal",
              sidebarCollapsed ? "justify-center px-2" : "justify-start gap-3",
              isActive(overviewItem.href)
                ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
            onClick={() => router.push(`/dashboard/stores/${id}${overviewItem.href}`)}
            title={sidebarCollapsed ? overviewItem.label : undefined}
          >
            <overviewItem.icon className="h-5 w-5" />
            {!sidebarCollapsed && overviewItem.label}
          </Button>

          {/* Catalogue Dropdown */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full font-normal",
                sidebarCollapsed ? "justify-center px-2" : "justify-start gap-3",
                isCatalogueActive
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
              onClick={() => setCatalogueOpen(!catalogueOpen)}
              title={sidebarCollapsed ? "Catalogue" : undefined}
            >
              <LayoutGrid className="h-5 w-5" />
              {!sidebarCollapsed && (
                <>
                  Catalogue
                  <ChevronRight className={cn(
                    "h-4 w-4 ml-auto transition-transform",
                    catalogueOpen && "rotate-90"
                  )} />
                </>
              )}
            </Button>

            {catalogueOpen && !sidebarCollapsed && (
              <div className="pl-8 space-y-1">
                {catalogueItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Button
                      key={item.href}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 font-normal text-sm",
                        active
                          ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                      onClick={() => router.push(`/dashboard/stores/${id}${item.href}`)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Autres menu items */}
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full font-normal",
                  sidebarCollapsed ? "justify-center px-2" : "justify-start gap-3",
                  active
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => router.push(`/dashboard/stores/${id}${item.href}`)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5" />
                {!sidebarCollapsed && item.label}
              </Button>
            )
          })}
        </nav>

        <Separator />

        {/* Bottom Section */}
        <div className="p-3 space-y-2">
          {/* Applications Button */}
          <Button 
            variant="ghost" 
            className={cn(
              "w-full font-normal text-gray-700",
              sidebarCollapsed ? "justify-center px-2" : "justify-start gap-3"
            )}
            title={sidebarCollapsed ? "Applications" : undefined}
          >
            <Grid3x3 className="h-5 w-5" />
            {!sidebarCollapsed && "Applications"}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full p-2 h-auto rounded-full hover:bg-gray-100",
                  sidebarCollapsed ? "justify-center" : "justify-start gap-3"
                )}
              >
                <Avatar className="h-8 w-8 border-2 border-gray-200">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-blue-600 text-white font-semibold">
                    {session?.user?.name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">{session?.user?.name || "Utilisateur"}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email || ""}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold">{session?.user?.name || "Utilisateur"}</p>
                  <p className="text-xs font-normal text-gray-500">{session?.user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                <User className="h-4 w-4 mr-2" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => router.push("/api/auth/signout")}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
