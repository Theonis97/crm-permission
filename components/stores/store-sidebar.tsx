"use client"

import { useState, useEffect } from "react"
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
  LogOut,
  ChevronDown,
  Plus,
  LayoutGrid,
  ChevronRightIcon,
  ChevronLeft,
  Calculator,
  ChevronRight,
  Grid3x3,
  User,
  Map,
  Shield,
  UserCog,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { STORE_PERMISSIONS } from "@/types/store-auth"

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

interface StoreSidebarProps {
  storeId: string
  currentStore: Store | null
  stores: Store[]
  loading: boolean
  onStoreChange: (storeId: string) => void
}

interface MenuItem {
  icon: any
  label: string
  href: string
  permission?: string
  children?: MenuItem[]
}

// Configuration des éléments de menu avec leurs permissions
const overviewItem: MenuItem = { 
  icon: Home, 
  label: "Vue d'ensemble", 
  href: "",
  permission: STORE_PERMISSIONS.DASHBOARD_VIEW
}

const catalogueItems: MenuItem[] = [
  { 
    icon: Package, 
    label: "Produits", 
    href: "/products",
    permission: STORE_PERMISSIONS.PRODUCTS_VIEW
  },
  { 
    icon: FolderTree, 
    label: "Catégories", 
    href: "/categories",
    permission: STORE_PERMISSIONS.CATEGORIES_VIEW
  },
  { 
    icon: Tag, 
    label: "Marques", 
    href: "/brands",
    permission: STORE_PERMISSIONS.BRANDS_VIEW
  },
]

const ordersItems: MenuItem[] = [
  { 
    icon: ShoppingBag, 
    label: "Commandes clients", 
    href: "/orders",
    permission: STORE_PERMISSIONS.ORDERS_VIEW
  },
  { 
    icon: Truck, 
    label: "Demandes livreurs", 
    href: "/delivery-requests",
    permission: STORE_PERMISSIONS.ORDERS_VIEW
  },
]

const menuItems: MenuItem[] = [
  { 
    icon: Calculator, 
    label: "Caisse", 
    href: "/pos",
    permission: STORE_PERMISSIONS.POS_ACCESS
  },
  { 
    icon: Users, 
    label: "Contacts", 
    href: "/contacts",
    permission: STORE_PERMISSIONS.CONTACTS_VIEW
  },
  { 
    icon: Truck, 
    label: "Livreurs", 
    href: "/drivers",
    permission: STORE_PERMISSIONS.DRIVERS_VIEW
  },
  { 
    icon: Map, 
    label: "Zones", 
    href: "/zones",
    permission: STORE_PERMISSIONS.ZONES_VIEW
  },
  { 
    icon: TrendingUp, 
    label: "Mouvements", 
    href: "/movements",
    permission: STORE_PERMISSIONS.MOVEMENTS_VIEW
  },
]

const adminItems: MenuItem[] = [
  { 
    icon: Users, 
    label: "Utilisateurs", 
    href: "/users",
    permission: STORE_PERMISSIONS.USERS_VIEW
  },
  { 
    icon: UserCog, 
    label: "Rôles", 
    href: "/roles",
    permission: STORE_PERMISSIONS.USERS_ROLES
  }
]

export function StoreSidebar({ 
  storeId, 
  currentStore, 
  stores, 
  loading, 
  onStoreChange 
}: StoreSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(true)

  // Récupérer les permissions de l'utilisateur pour ce magasin
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!session?.user?.id || !storeId) return

      try {
        setPermissionsLoading(true)
        const response = await fetch(`/api/users/${session.user.id}/permissions`)
        if (response.ok) {
          const data = await response.json()
          setUserPermissions(data.permissions || [])
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error)
      } finally {
        setPermissionsLoading(false)
      }
    }

    fetchUserPermissions()
  }, [session?.user?.id, storeId])

  // Vérifier si l'utilisateur a une permission
  const hasPermission = (permission?: string) => {
    if (!permission) return true
    return userPermissions.includes(permission)
  }

  // Filtrer les éléments de menu selon les permissions
  const getVisibleItems = (items: MenuItem[]) => {
    return items.filter(item => hasPermission(item.permission))
  }

  const isActive = (href: string) => {
    const basePath = `/dashboard/stores/${storeId}`
    if (href === "") {
      return pathname === basePath
    }
    return pathname.startsWith(`${basePath}${href}`)
  }

  const visibleCatalogueItems = getVisibleItems(catalogueItems)
  const visibleOrdersItems = getVisibleItems(ordersItems)
  const visibleMenuItems = getVisibleItems(menuItems)
  const visibleAdminItems = getVisibleItems(adminItems)
  const isCatalogueActive = visibleCatalogueItems.some(item => isActive(item.href))
  const isOrdersActive = visibleOrdersItems.some(item => isActive(item.href))

  if (permissionsLoading) {
    return (
      <aside className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </aside>
    )
  }

  return (
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
                  onClick={() => onStoreChange(store.id)}
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
        
        {/* Collapse Button */}
        <Button
          variant="default"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-6 -right-3 h-5 w-5 p-0 hover:bg-gray-100"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Collapsed State */}
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
        {hasPermission(overviewItem.permission) && (
          <Button
            variant="ghost"
            className={cn(
              "w-full font-normal",
              sidebarCollapsed ? "justify-center px-2" : "justify-start gap-3",
              isActive(overviewItem.href)
                ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
            onClick={() => router.push(`/dashboard/stores/${storeId}${overviewItem.href}`)}
            title={sidebarCollapsed ? overviewItem.label : undefined}
          >
            <overviewItem.icon className="h-5 w-5" />
            {!sidebarCollapsed && overviewItem.label}
          </Button>
        )}

        {/* Catalogue Dropdown */}
        {visibleCatalogueItems.length > 0 && (
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
                {visibleCatalogueItems.map((item) => {
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
                      onClick={() => router.push(`/dashboard/stores/${storeId}${item.href}`)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Orders Dropdown */}
        {visibleOrdersItems.length > 0 && (
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full font-normal",
                sidebarCollapsed ? "justify-center px-2" : "justify-start gap-3",
                isOrdersActive
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
              onClick={() => setOrdersOpen(!ordersOpen)}
              title={sidebarCollapsed ? "Commandes" : undefined}
            >
              <ShoppingBag className="h-5 w-5" />
              {!sidebarCollapsed && (
                <>
                  Commandes
                  <ChevronRight className={cn(
                    "h-4 w-4 ml-auto transition-transform",
                    ordersOpen && "rotate-90"
                  )} />
                </>
              )}
            </Button>

            {ordersOpen && !sidebarCollapsed && (
              <div className="pl-8 space-y-1">
                {visibleOrdersItems.map((item) => {
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
                      onClick={() => router.push(`/dashboard/stores/${storeId}${item.href}`)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Autres menu items */}
        {visibleMenuItems.map((item) => {
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
              onClick={() => router.push(`/dashboard/stores/${storeId}${item.href}`)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5" />
              {!sidebarCollapsed && item.label}
            </Button>
          )
        })}

        {/* Section Administration */}
        {visibleAdminItems.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Administration
                </h3>
              </div>
            )}
            
            {visibleAdminItems.map((item) => {
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
                      ? "bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => router.push(`/dashboard/stores/${storeId}${item.href}`)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {!sidebarCollapsed && item.label}
                </Button>
              )
            })}
          </>
        )}
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
  )
}
