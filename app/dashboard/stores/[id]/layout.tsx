"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
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
  Store,
  Home,
  ShoppingBag,
  Users,
  Package,
  FolderTree,
  Tag,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Grid3x3,
  LogOut,
  Settings,
  User,
  Truck,
  LayoutGrid,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StoreLayoutProps {
  children: React.ReactNode
  params: {
    id: string
  }
}

const mockStores = [
  { id: "1", name: "Magasin Centre-Ville", logo: "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=200&h=200&fit=crop" },
  { id: "2", name: "Magasin Akwa", logo: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=200&h=200&fit=crop" },
  { id: "3", name: "Magasin Bonanjo", logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop" },
]

const menuItems = [
  { icon: Home, label: "Vue d'ensemble", href: "" },
  { icon: ShoppingBag, label: "Ventes", href: "/sales" },
  { icon: Users, label: "Contacts", href: "/contacts" },
  { icon: Truck, label: "Livreurs", href: "/drivers" },
  { icon: TrendingUp, label: "Mouvements", href: "/movements" },
]

const catalogueItems = [
  { icon: Package, label: "Produits", href: "/products" },
  { icon: FolderTree, label: "Catégories", href: "/categories" },
  { icon: Tag, label: "Marques", href: "/brands" },
]

export default function StoreLayout({ children, params }: StoreLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentStore, setCurrentStore] = useState(mockStores.find(s => s.id === params.id) || mockStores[0])
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleStoreChange = (storeId: string) => {
    const store = mockStores.find(s => s.id === storeId)
    if (store) {
      setCurrentStore(store)
      router.push(`/dashboard/stores/${storeId}`)
    }
  }

  const isActive = (href: string) => {
    const basePath = `/dashboard/stores/${params.id}`
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
        {/* Collapse Button */}
        <div className="p-3 border-b border-gray-200 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 p-0"
          >
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Store Selector */}
        <div className={cn("p-4 border-b border-gray-200", sidebarCollapsed && "hidden")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentStore.logo} alt={currentStore.name} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {currentStore.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">{currentStore.name}</p>
                    <p className="text-xs text-gray-500">Magasin</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Mes Magasins</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mockStores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => handleStoreChange(store.id)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={store.logo} alt={store.name} />
                    <AvatarFallback className="text-xs">
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
              <DropdownMenuItem onClick={() => router.push("/dashboard/stores")}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un magasin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                onClick={() => router.push(`/dashboard/stores/${params.id}${item.href}`)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5" />
                {!sidebarCollapsed && item.label}
              </Button>
            )
          })}

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
                      onClick={() => router.push(`/dashboard/stores/${params.id}${item.href}`)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
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
                  "w-full p-2 h-auto",
                  sidebarCollapsed ? "justify-center" : "justify-start gap-3"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-500">admin@example.com</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
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
