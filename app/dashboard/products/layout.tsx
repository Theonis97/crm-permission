"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Package, Home, FolderTree, Menu, X, Grid2x2 } from "lucide-react"
import { ModuleNavbar } from "@/components/navigation/module-navbar"

const navigation = [
    {
        name: "Accueil",
        href: "/dashboard/products",
        icon: Home,
    },
    {
        name: "Produits",
        href: "/dashboard/products/list",
        icon: Package,
    },
    {
        name: "Catégories",
        href: "/dashboard/products/categories",
        icon: FolderTree,
    },
]

export default function ProductsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}


            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <ModuleNavbar
                    title="Produits"
                    description="Gérez votre base de données Produits et Categories"
                    icon={Grid2x2}

                />

                {/* Mobile menu button */}
                <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
                    <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold text-gray-900">Produits</span>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex container mx-auto max-w-7xl">
                    {/* Sidebar */}
                    <div
                        className={cn(
                            "fixed inset-y-0 left-0 z-50 w-64 top-24 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
                            sidebarOpen ? "translate-x-0" : "-translate-x-full",
                        )}
                    >
                      

                        <nav className="mt-6 px-3 h-[80vh]">
                            <ul className="space-y-1">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                                    isActive
                                                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                                                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                                                )}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        "mr-3 h-5 w-5 flex-shrink-0",
                                                        isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500",
                                                    )}
                                                />
                                                {item.name}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </nav>
                    </div>
                    <div className="flex-1 p-6">
                    {children}

                    </div>
                </main>
            </div>
        </div>
    )
}
