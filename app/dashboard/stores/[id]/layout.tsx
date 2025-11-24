"use client"

import { useState, useEffect, use } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { StoreSidebar } from "@/components/stores/store-sidebar"

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

export default function StoreLayout({ children, params }: StoreLayoutProps) {
  const router = useRouter()
  const { id } = use(params)
  const [stores, setStores] = useState<Store[]>([])
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar avec permissions */}
      <StoreSidebar
        storeId={id}
        currentStore={currentStore}
        stores={stores}
        loading={loading}
        onStoreChange={handleStoreChange}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
