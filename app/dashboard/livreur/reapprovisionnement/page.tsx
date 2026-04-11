"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import HomeLayout from "../../home-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  ChevronLeft,
  Minus,
  Plus,
  Package,
  Store as StoreIcon,
  Send,
  Search,
  MapPin,
  Truck,
  Home,
  Wallet,
  ShoppingBag,
  Receipt,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const ORANGE = "#FF8C00"

type MainTab = "accueil" | "magasin" | "stock" | "ventes"

type StoreRow = { id: string; name: string; address: string | null }
type StaffDriverOption = { id: string; name: string; phone: string; storeName: string }
type ProductRow = {
  productId: string
  name: string
  sku: string | null
  photo: string | null
  stockMagasin: number
}

type RestockRequestRow = {
  id: string
  status: string
  createdAt: string
  notes?: string | null
  store: { id: string; name: string }
  items: Array<{
    id: string
    requestedQuantity: number
    product: { id: string; name: string; sku: string | null; photos: string[] }
    variant?: { id: string; name: string; sku: string | null } | null
  }>
}

type StockLineRow = {
  id: string
  quantity: number
  reserved: number
  product: {
    id: string
    name: string
    sku: string | null
    photos: string[]
    prixVente: number | null
  }
  variant?: {
    id: string
    name: string
    sku: string | null
    images?: unknown
  } | null
}

type SaleRow = {
  id: string
  totalAmount: number
  declaredAt: string
  notes?: string | null
  store: { id: string; name: string }
  items: Array<{
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    product: { id: string; name: string; sku: string | null; photos: string[] }
    variant?: { id: string; name: string; sku: string | null } | null
  }>
}

// Panier de ventes : clé = productId, valeur = { qty, unitPrice }
type SaleCart = Record<string, { qty: number; unitPrice: number }>

/** Petit carreau produit générique (photo + badge + texte) */
function ProductTile({
  photo,
  name,
  badge,
  badgeBg = "#000000cc",
  sub,
  size = "md",
}: {
  photo?: string | null
  name: string
  badge?: string | number
  badgeBg?: string
  sub?: string
  size?: "sm" | "md" | "lg"
}) {
  const dim = size === "sm" ? "h-[4.5rem] w-[4.5rem]" : size === "lg" ? "h-28 w-28" : "h-20 w-20"
  const nameClass = size === "sm" ? "text-[10px]" : size === "lg" ? "text-xs" : "text-[11px]"
  const badgeClass = size === "sm" ? "text-[9px] px-0.5 py-px" : "text-[10px] px-1 py-0.5"
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className={cn("relative rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-sm shrink-0", dim)}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-7 w-7 text-neutral-400" />
          </div>
        )}
        {badge !== undefined && (
          <span
            className={cn("absolute bottom-0 right-0 font-bold text-white leading-none rounded-tl-lg", badgeClass)}
            style={{ backgroundColor: badgeBg }}
          >
            ×{badge}
          </span>
        )}
      </div>
      <p className={cn("text-center leading-tight line-clamp-2 text-neutral-800 font-medium w-full", nameClass)}>{name}</p>
      {sub && <p className="text-[9px] text-neutral-400 leading-tight text-center">{sub}</p>}
    </div>
  )
}

function formatFrDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function requestStatusUi(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "En attente", className: "bg-neutral-200 text-neutral-800" }
    case "APPROVED":
      return { label: "Approuvée", className: "bg-sky-100 text-sky-900" }
    case "REJECTED":
      return { label: "Refusée", className: "bg-neutral-200 text-neutral-600" }
    case "COMPLETED":
      return { label: "Terminée", className: "bg-emerald-100 text-emerald-900" }
    default:
      return { label: status, className: "bg-neutral-100 text-neutral-700" }
  }
}

function firstPhoto(stock: StockLineRow): string | null {
  const v = stock.variant?.images
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0] as string
  const p = stock.product.photos
  if (p?.length) return p[0]
  return null
}

export default function LivreurReapprovisionnementPage() {
  const router = useRouter()
  const { status } = useSession()
  const [mainTab, setMainTab] = useState<MainTab>("accueil")
  const [step, setStep] = useState<"store" | "products" | "confirm">("store")
  const [bootError, setBootError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<StoreRow[]>([])
  const [portalMode, setPortalMode] = useState<"driver" | "staff">("driver")
  const [staffDrivers, setStaffDrivers] = useState<StaffDriverOption[]>([])
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<string>("")
  const [driverName, setDriverName] = useState("")
  const [driverHomeStoreId, setDriverHomeStoreId] = useState<string>("")
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [noDriverProfile, setNoDriverProfile] = useState(false)
  const [noDriverProfileMsg, setNoDriverProfileMsg] = useState("")

  const [requests, setRequests] = useState<RestockRequestRow[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [stockLines, setStockLines] = useState<StockLineRow[]>([])
  const [stockLoading, setStockLoading] = useState(false)

  // États pour l'onglet Ventes
  const [sales, setSales] = useState<SaleRow[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [saleStep, setSaleStep] = useState<"history" | "declare" | "confirm">("history")
  const [saleCart, setSaleCart] = useState<SaleCart>({})
  const [saleNotes, setSaleNotes] = useState("")
  const [saleSubmitting, setSaleSubmitting] = useState(false)

  const canQueryDriver = Boolean(
    selectedDeliveryPersonId && (portalMode === "driver" || portalMode === "staff"),
  )

  const loadRequests = useCallback(async () => {
    if (!canQueryDriver) return
    setRequestsLoading(true)
    try {
      const url =
        portalMode === "staff"
          ? `/api/driver/restock/requests?deliveryPersonId=${encodeURIComponent(selectedDeliveryPersonId)}`
          : `/api/driver/restock/requests`
      const res = await fetch(url)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRequests([])
        return
      }
      setRequests(json.data || [])
    } finally {
      setRequestsLoading(false)
    }
  }, [canQueryDriver, portalMode, selectedDeliveryPersonId])

  const loadStock = useCallback(async () => {
    if (!canQueryDriver) return
    setStockLoading(true)
    try {
      const url =
        portalMode === "staff"
          ? `/api/driver/restock/stock?deliveryPersonId=${encodeURIComponent(selectedDeliveryPersonId)}`
          : `/api/driver/restock/stock`
      const res = await fetch(url)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStockLines([])
        return
      }
      setStockLines(json.data?.items || [])
    } finally {
      setStockLoading(false)
    }
  }, [canQueryDriver, portalMode, selectedDeliveryPersonId])

  const loadSales = useCallback(async () => {
    if (!canQueryDriver) return
    setSalesLoading(true)
    try {
      const url =
        portalMode === "staff"
          ? `/api/driver/sales?deliveryPersonId=${encodeURIComponent(selectedDeliveryPersonId)}`
          : `/api/driver/sales`
      const res = await fetch(url)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setSales([]); return }
      setSales(json.data || [])
    } finally {
      setSalesLoading(false)
    }
  }, [canQueryDriver, portalMode, selectedDeliveryPersonId])

  // Helpers panier de ventes
  const saleCartLines = useMemo(() =>
    Object.entries(saleCart)
      .filter(([, v]) => v.qty > 0)
      .map(([productId, v]) => {
        const stock = stockLines.find((s) => s.product.id === productId)
        return { productId, qty: v.qty, unitPrice: v.unitPrice, stock }
      }),
    [saleCart, stockLines]
  )
  const saleTotalAmount = useMemo(
    () => saleCartLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0),
    [saleCartLines]
  )
  const formatPrice = (n: number) =>
    n.toLocaleString("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 })

  const submitSale = async () => {
    if (saleCartLines.length === 0) return
    setSaleSubmitting(true)
    try {
      const res = await fetch("/api/driver/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: saleCartLines.map((l) => ({
            productId: l.productId,
            quantity: l.qty,
            unitPrice: l.unitPrice,
          })),
          notes: saleNotes || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || "Erreur lors de la déclaration")
        return
      }
      toast.success("Ventes déclarées avec succès !")
      setSaleCart({})
      setSaleNotes("")
      setSaleStep("history")
      await loadSales()
      await loadStock() // rafraîchir le stock après déclaration
    } finally {
      setSaleSubmitting(false)
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status !== "authenticated") return

    let cancelled = false
      ; (async () => {
        setLoading(true)
        setBootError(null)
        try {
          const res = await fetch("/api/driver/restock/stores")
          const json = await res.json().catch(() => ({}))
          if (cancelled) return
          if (!res.ok) {
            setBootError(
              typeof json.error === "string" ? json.error : "Impossible d’accéder à l’espace livreur.",
            )
            setStores([])
            return
          }
          // Cas : rôle livreur mais aucune fiche DeliveryPerson en base
          if (json.warning === "no_driver_profile") {
            setNoDriverProfile(true)
            setNoDriverProfileMsg(
              json.message ||
              "Votre compte n'a pas encore de fiche livreur. Contactez un administrateur.",
            )
            setStores([])
            return
          }

          setStores(json.data || [])
          const mode = json.mode === "staff" ? "staff" : "driver"
          setPortalMode(mode)
          if (json.driver?.name) {
            setDriverName(json.driver.name)
            setSelectedDeliveryPersonId(json.driver.id)
            setDriverHomeStoreId(json.driver.homeStoreId || "")
          } else {
            setDriverName("")
            setSelectedDeliveryPersonId("")
            setDriverHomeStoreId("")
          }
          setStaffDrivers(Array.isArray(json.drivers) ? json.drivers : [])
          if (mode === "staff" && (!json.drivers || json.drivers.length === 0)) {
            setBootError(
              "Aucun livreur actif : impossible de créer une demande pour le compte gestionnaire.",
            )
            setStores([])
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [status, router])

  useEffect(() => {
    if (bootError || loading) return
    if (mainTab !== "accueil") return
    if (!canQueryDriver) return
    loadRequests()
  }, [mainTab, bootError, loading, canQueryDriver, loadRequests])

  useEffect(() => {
    if (bootError || loading) return
    if (mainTab !== "stock") return
    if (!canQueryDriver) return
    loadStock()
  }, [mainTab, bootError, loading, canQueryDriver, loadStock])

  useEffect(() => {
    if (bootError || loading) return
    if (mainTab !== "ventes") return
    if (!canQueryDriver) return
    loadSales()
    // Aussi charger le stock pour la déclaration
    if (stockLines.length === 0) loadStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, bootError, loading, canQueryDriver, loadSales])

  const loadProducts = async (store: StoreRow) => {
    if (portalMode === "staff" && !selectedDeliveryPersonId) {
      toast.error("Choisissez d’abord le livreur concerné")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/driver/restock/products?storeId=${encodeURIComponent(store.id)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Erreur chargement produits")
        return
      }
      setSelectedStore(store)
      setProducts(json.data || [])
      setStep("products")
      setCart({})
      setSearch("")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)),
    )
  }, [products, search])

  const addOne = (productId: string) => {
    setCart((c) => ({ ...c, [productId]: (c[productId] || 0) + 1 }))
  }

  const subOne = (productId: string) => {
    setCart((c) => {
      const n = (c[productId] || 0) - 1
      if (n <= 0) {
        const next = { ...c }
        delete next[productId]
        return next
      }
      return { ...c, [productId]: n }
    })
  }

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([productId, qty]) => {
        const p = products.find((x) => x.productId === productId)
        return { productId, qty, name: p?.name ?? productId, sku: p?.sku }
      })
  }, [cart, products])

  const cartCount = cartLines.reduce((a, l) => a + l.qty, 0)

  const headerSubtitleMagasin = useMemo(() => {
    if (portalMode === "driver" && driverName) return driverName
    if (portalMode === "staff") {
      const d = staffDrivers.find((x) => x.id === selectedDeliveryPersonId)
      if (d) return `${d.name} · ${d.storeName}`
      return "Mode gestionnaire — choisir un livreur"
    }
    return ""
  }, [portalMode, driverName, staffDrivers, selectedDeliveryPersonId])

  const submit = async () => {
    if (!selectedStore) return
    const items = cartLines.map((l) => ({
      productId: l.productId,
      requestedQuantity: l.qty,
    }))
    if (items.length === 0) {
      toast.error("Ajoutez au moins un produit")
      return
    }
    if (portalMode === "staff" && !selectedDeliveryPersonId) {
      toast.error("Sélectionnez le livreur")
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = { storeId: selectedStore.id, notes, items }
      if (portalMode === "staff") {
        payload.deliveryPersonId = selectedDeliveryPersonId
      }
      const res = await fetch("/api/driver/restock/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || "Échec de l’envoi")
        return
      }
      toast.success(json.message || "Demande envoyée")
      setStep("store")
      setMainTab("accueil")
      setSelectedStore(null)
      setCart({})
      setNotes("")
      setProducts([])
      loadRequests()
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    if (mainTab === "magasin") {
      if (step === "confirm") {
        setStep("products")
        return
      }
      if (step === "products") {
        setStep("store")
        setSelectedStore(null)
        setProducts([])
        setCart({})
        return
      }
      if (step === "store") {
        setMainTab("accueil")
        return
      }
    }
    router.push("/dashboard")
  }

  const openNewRequest = () => {
    setMainTab("magasin")
    setStep("store")
    setSelectedStore(null)
    setProducts([])
    setCart({})
    setSearch("")
  }

  if (status === "loading" || (loading && step === "store" && stores.length === 0 && !bootError && !noDriverProfile)) {
    return (
      <HomeLayout>
        <div className="min-h-[70dvh] flex items-center justify-center px-4">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: ORANGE }} />
        </div>
      </HomeLayout>
    )
  }

  // Rôle livreur présent mais aucune fiche DeliveryPerson liée à cet email
  if (noDriverProfile) {
    return (
      <HomeLayout>
        <div className="max-w-lg mx-auto px-4 py-8 min-h-[70dvh] flex flex-col items-center justify-center gap-6">
          <div
            className="h-20 w-20 rounded-3xl flex items-center justify-center"
            style={{ backgroundColor: ORANGE + "22" }}
          >
            <Truck className="h-10 w-10" style={{ color: ORANGE }} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Fiche livreur manquante</h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm">{noDriverProfileMsg}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm w-full">
            <p className="text-xs text-amber-800 font-medium mb-1">À communiquer à l&apos;administrateur :</p>
            <p className="text-xs text-amber-700">
              Créer une fiche <strong>Livreur</strong> avec ce compte utilisateur dans la section
              &quot;Gestion des livreurs&quot; du CRM.
            </p>
          </div>
          <Button className="h-12 rounded-xl w-full max-w-sm" variant="outline" onClick={() => router.push("/dashboard")}>
            Retour au tableau de bord
          </Button>
        </div>
      </HomeLayout>
    )
  }

  if (bootError) {
    return (
      <HomeLayout>
        <div className="max-w-lg mx-auto px-4 py-8 min-h-[70dvh] flex flex-col justify-center">
          <p className="text-center text-gray-700 text-base leading-relaxed">{bootError}</p>
          <p className="text-center text-sm text-gray-500 mt-4">
            {bootError?.includes("gestionnaires") || bootError?.includes("gestionnaire")
              ? "Les administrateurs et gestionnaires magasin y accèdent avec les droits utilisateurs, rôles ou paramètres magasin."
              : "Pour un compte livreur : utilisez le même email que sur la fiche livreur dans le CRM."}
          </p>
          <Button className="mt-8 h-12 rounded-xl" variant="outline" onClick={() => router.push("/dashboard")}>
            Retour au tableau de bord
          </Button>
        </div>
      </HomeLayout>
    )
  }

  return (
    <HomeLayout>
      <div className="max-w-lg mx-auto min-h-[100dvh] bg-neutral-100 pb-28 px-3 sm:px-4 pt-0 relative">
        {/* En-tête orange — Accueil & Stock */}
        {(mainTab === "accueil" || mainTab === "stock") && (
          <header
            className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-4 pt-4 pb-4 text-white shadow-md rounded-b-2xl"
            style={{ backgroundColor: ORANGE }}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight">Livreur</h1>
                <p className="text-sm text-white/90">
                  {mainTab === "accueil" ? "Demandes aux magasins" : "Mon stock"}
                </p>
              </div>
            </div>
          </header>
        )}

        {/* En-tête magasin (flux existant) */}
        {mainTab === "magasin" && (
          <header className="sticky top-0 z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 bg-neutral-50/95 backdrop-blur border-b border-neutral-200 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-11 w-11 rounded-full touch-manipulation"
              onClick={goBack}
              aria-label="Retour"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-gray-900 truncate">Demander du stock</h1>
              {headerSubtitleMagasin ? (
                <p className="text-xs text-gray-500 truncate">{headerSubtitleMagasin}</p>
              ) : null}
            </div>
            {step === "products" && cartCount > 0 ? (
              <Button
                type="button"
                size="sm"
                className="h-10 max-w-[55%] shrink rounded-full touch-manipulation text-white border-0 px-3 text-xs sm:text-sm"
                style={{ backgroundColor: ORANGE }}
                onClick={() => setStep("confirm")}
              >
                <span className="truncate">Envoyer votre commande ({cartCount})</span>
              </Button>
            ) : null}
          </header>
        )}

        {/* Onglet Accueil */}
        {mainTab === "accueil" && (
          <section className="mt-4 space-y-3 pb-4">
            {portalMode === "staff" && staffDrivers.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 space-y-2">
                <Label className="text-amber-950 font-medium">Livreur concerné</Label>
                <Select value={selectedDeliveryPersonId || undefined} onValueChange={setSelectedDeliveryPersonId}>
                  <SelectTrigger className="h-12 rounded-xl text-base bg-white">
                    <SelectValue placeholder="Choisir un livreur…" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-base py-3">
                        <span className="font-medium">{d.name}</span>
                        <span className="block text-xs text-muted-foreground">{d.storeName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {!canQueryDriver ? (
              <p className="text-center text-neutral-500 py-8 text-sm">Sélectionnez un livreur pour voir les demandes.</p>
            ) : requestsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-9 w-9 animate-spin text-neutral-400" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center text-neutral-500 py-12 text-sm">Aucune demande pour le moment.</p>
            ) : (
              <ul className="space-y-3">
                {requests.map((req) => {
                  const qty = req.items.reduce((s, it) => s + it.requestedQuantity, 0)
                  const st = requestStatusUi(req.status)
                  return (
                    <li
                      key={req.id}
                      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                    >
                      {/* En-tête */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">
                            {req.store.name}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {formatFrDateTime(req.createdAt)} · {qty} article{qty > 1 ? "s" : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-medium px-2.5 py-1 rounded-full",
                            st.className,
                          )}
                        >
                          {st.label}
                        </span>
                      </div>
                      {/* Produits en carreaux */}
                      <div className="flex flex-wrap gap-2">
                        {req.items.map((it) => {
                          const photo =
                            Array.isArray(it.product?.photos) && it.product.photos.length > 0
                              ? it.product.photos[0]
                              : null
                          return (
                            <ProductTile
                              key={it.id}
                              photo={photo}
                              name={it.variant ? `${it.product.name} · ${it.variant.name}` : it.product.name}
                              badge={it.requestedQuantity}
                              badgeBg="#374151"
                              size="sm"
                            />
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {/* Onglet Stock */}
        {mainTab === "stock" && (
          <section className="mt-4 space-y-3 pb-4">
            {portalMode === "staff" && staffDrivers.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 space-y-2">
                <Label className="text-amber-950 font-medium">Livreur</Label>
                <Select value={selectedDeliveryPersonId || undefined} onValueChange={setSelectedDeliveryPersonId}>
                  <SelectTrigger className="h-12 rounded-xl text-base bg-white">
                    <SelectValue placeholder="Choisir un livreur…" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-base py-3">
                        <span className="font-medium">{d.name}</span>
                        <span className="block text-xs text-muted-foreground">{d.storeName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {!canQueryDriver ? (
              <p className="text-center text-neutral-500 py-8 text-sm">Sélectionnez un livreur pour voir le stock.</p>
            ) : stockLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-9 w-9 animate-spin text-neutral-400" />
              </div>
            ) : stockLines.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Package className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
                <p className="text-neutral-500 text-sm">Aucun article en stock pour l’instant.</p>
                <p className="text-neutral-400 text-xs mt-2">Après approbation d’une demande par un magasin, vos quantités apparaîtront ici.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 pb-4">
                {stockLines.map((row) => {
                  const img = firstPhoto(row)
                  const disp = row.quantity - (row.reserved || 0)
                  const label = row.variant
                    ? `${row.product.name} · ${row.variant.name}`
                    : row.product.name
                  return (
                    <div
                      key={row.id}
                      className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-sm"
                    >
                      {/* Image */}
                      <div className="relative rounded-xl overflow-hidden bg-neutral-100 aspect-square mb-2">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-7 w-7 text-neutral-300" />
                          </div>
                        )}
                        {/* Quantité totale */}
                        <span
                          className="absolute top-1 right-1 h-5 min-w-[1.25rem] px-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: ORANGE }}
                        >
                          {row.quantity}
                        </span>
                      </div>
                      {/* Nom */}
                      <p className="text-[11px] font-semibold text-neutral-900 leading-snug line-clamp-2 mb-1 flex-1">
                        {label}
                      </p>
                      {/* Dispo */}
                      <p className="text-[9px] text-neutral-400">
                        Dispo : {disp}
                        {row.reserved ? ` · rés. ${row.reserved}` : ""}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* Onglet Magasin */}
        {mainTab === "magasin" && step === "store" && (
          <section className="mt-4 space-y-3">
            {portalMode === "staff" && staffDrivers.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
                <Label className="text-amber-950 font-medium">Livreur concerné</Label>
                <Select value={selectedDeliveryPersonId || undefined} onValueChange={setSelectedDeliveryPersonId}>
                  <SelectTrigger className="h-12 rounded-xl text-base bg-white">
                    <SelectValue placeholder="Choisir un livreur…" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-base py-3">
                        <span className="font-medium">{d.name}</span>
                        <span className="block text-xs text-muted-foreground">{d.storeName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-900/80">
                  La demande sera enregistrée au nom de ce livreur auprès de la boutique choisie.
                </p>
              </div>
            ) : null}
            <p className="text-sm text-gray-600 px-1">
              Choisissez la boutique auprès de laquelle vous demandez du stock.
            </p>
            {/* Boutique d'attache en haut si connue */}
            {driverHomeStoreId && portalMode === "driver" && (() => {
              const sorted = [
                ...stores.filter((s) => s.id === driverHomeStoreId),
                ...stores.filter((s) => s.id !== driverHomeStoreId),
              ]
              return (
                <ul className="space-y-2">
                  {sorted.map((s) => {
                    const isHome = s.id === driverHomeStoreId
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => loadProducts(s)}
                          className={cn(
                            "w-full text-left rounded-2xl border p-4 shadow-sm",
                            "active:scale-[0.99] transition-transform touch-manipulation",
                            "flex gap-3 items-start min-h-[4.5rem]",
                            isHome
                              ? "border-orange-300 bg-orange-50"
                              : "border-neutral-200 bg-white",
                          )}
                        >
                          <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-white"
                            style={{ backgroundColor: isHome ? ORANGE : "#9ca3af" }}
                          >
                            <StoreIcon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{s.name}</p>
                              {isHome && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none"
                                  style={{ backgroundColor: ORANGE }}
                                >
                                  Ma boutique
                                </span>
                              )}
                            </div>
                            {s.address ? (
                              <p className="text-xs text-gray-500 mt-1 flex gap-1 items-start">
                                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{s.address}</span>
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            })()}
            {/* Sans boutique d'attache connue (mode staff ou pas d'info) */}
            {(!driverHomeStoreId || portalMode === "staff") && (
              <ul className="space-y-2">
                {stores.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={loading || (portalMode === "staff" && !selectedDeliveryPersonId)}
                      onClick={() => loadProducts(s)}
                      className={cn(
                        "w-full text-left rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
                        "active:scale-[0.99] transition-transform touch-manipulation",
                        "flex gap-3 items-start min-h-[4.5rem]",
                      )}
                    >
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-white"
                        style={{ backgroundColor: ORANGE }}
                      >
                        <StoreIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        {s.address ? (
                          <p className="text-xs text-gray-500 mt-1 flex gap-1 items-start">
                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{s.address}</span>
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {stores.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune boutique active.</p>
            ) : null}
          </section>
        )}

        {mainTab === "magasin" && step === "products" && selectedStore && (
          <section className="mt-4 space-y-3">
            <div className="rounded-xl px-3 py-2 text-white" style={{ backgroundColor: `${ORANGE}e6` }}>
              <p className="text-xs font-medium opacity-90">Magasin</p>
              <p className="text-sm font-semibold">{selectedStore.name}</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit…"
                className="pl-10 h-12 rounded-xl text-base"
                autoComplete="off"
              />
            </div>
            {/* Grille de carreaux produits */}
            <div className="grid grid-cols-3 gap-3 pb-36">
              {filtered.map((p) => {
                const q = cart[p.productId] || 0
                const inCart = q > 0
                return (
                  <div
                    key={p.productId}
                    className={cn(
                      "flex flex-col rounded-2xl border p-2.5 shadow-sm transition-colors",
                      inCart ? "border-orange-300 bg-orange-50" : "border-neutral-200 bg-white",
                    )}
                  >
                    {/* Image */}
                    <div className="relative rounded-xl overflow-hidden bg-neutral-100 aspect-square mb-2">
                      {p.photo && typeof p.photo === "string" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-neutral-300" />
                        </div>
                      )}
                      {inCart && (
                        <span
                          className="absolute top-1 right-1 h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: ORANGE }}
                        >
                          {q}
                        </span>
                      )}
                    </div>
                    {/* Nom + stock */}
                    <p className="text-[11px] font-semibold text-neutral-900 leading-snug line-clamp-2 mb-1 flex-1">
                      {p.name}
                    </p>
                    <p className="text-[9px] text-neutral-400 mb-2">Stock : {p.stockMagasin}</p>
                    {/* Contrôles + / − */}
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => subOne(p.productId)}
                        disabled={q === 0}
                        className={cn(
                          "h-8 w-8 rounded-full border flex items-center justify-center shrink-0 touch-manipulation transition-colors",
                          q === 0 ? "border-neutral-200 text-neutral-300" : "border-neutral-300 text-neutral-700 active:bg-neutral-100",
                        )}
                        aria-label="Diminuer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-bold tabular-nums text-neutral-800 w-5 text-center">{q}</span>
                      <button
                        type="button"
                        onClick={() => addOne(p.productId)}
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 touch-manipulation text-white active:opacity-80"
                        style={{ backgroundColor: ORANGE }}
                        aria-label="Augmenter"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-6">Aucun produit trouvé.</p>
            ) : null}
          </section>
        )}

        {mainTab === "magasin" && step === "confirm" && selectedStore && (
          <section className="mt-4 space-y-4 pb-32">
            <div
              className={cn(
                "rounded-xl border p-4",
                driverHomeStoreId && selectedStore.id !== driverHomeStoreId
                  ? "border-amber-300 bg-amber-50"
                  : "border-neutral-200 bg-white",
              )}
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Boutique destinataire</p>
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 shrink-0 text-gray-500" />
                <p className="font-bold text-gray-900 text-base">{selectedStore.name}</p>
                {driverHomeStoreId && selectedStore.id === driverHomeStoreId && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: ORANGE }}
                  >
                    Ma boutique
                  </span>
                )}
              </div>
              {driverHomeStoreId && selectedStore.id !== driverHomeStoreId && (
                <p className="text-xs text-amber-700 mt-1">
                  ⚠️ Vous envoyez vers une boutique différente de votre boutique habituelle.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Articles commandés</p>
              <div className="grid grid-cols-4 gap-2">
                {cartLines.map((l) => {
                  const prod = products.find((x) => x.productId === l.productId)
                  return (
                    <ProductTile
                      key={l.productId}
                      photo={prod?.photo ?? null}
                      name={l.name}
                      badge={l.qty}
                      badgeBg={ORANGE}
                      size="md"
                    />
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Note (optionnel)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Précisions pour le magasin…"
                rows={3}
                className="mt-1 rounded-xl text-base min-h-[5rem]"
              />
            </div>
          </section>
        )}

        {/* FAB nouvelle demande — visible surtout sur Accueil */}
        {mainTab === "accueil" && canQueryDriver && (
          <button
            type="button"
            onClick={openNewRequest}
            className="fixed z-30 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white touch-manipulation active:scale-95 transition-transform"
            style={{
              backgroundColor: ORANGE,
              bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))",
            }}
            aria-label="Nouvelle demande"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        )}

        {/* Bouton panier — s'affiche au-dessus de la barre de navigation */}
        {mainTab === "magasin" && step === "products" && cartCount > 0 && (
          <div
            className="fixed left-0 right-0 px-3 max-w-lg mx-auto z-50"
            style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              type="button"
              className="w-full h-14 text-base font-semibold rounded-2xl touch-manipulation text-white border-0 shadow-lg"
              style={{ backgroundColor: ORANGE }}
              onClick={() => setStep("confirm")}
            >
              <Package className="h-5 w-5 mr-2" />
              Voir mon panier ({cartCount} article{cartCount > 1 ? "s" : ""})
            </Button>
          </div>
        )}

        {/* Bouton envoi — écran récapitulatif */}
        {mainTab === "magasin" && step === "confirm" && (
          <div
            className="fixed left-0 right-0 px-3 max-w-lg mx-auto flex gap-2 z-50"
            style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              type="button"
              variant="outline"
              className="h-14 flex-1 rounded-2xl touch-manipulation shadow-md"
              onClick={() => setStep("products")}
            >
              Modifier
            </Button>
            <Button
              type="button"
              className="h-14 flex-[2] rounded-2xl touch-manipulation gap-2 shadow-lg"
              style={{ backgroundColor: "#16a34a" }}
              disabled={submitting || cartCount === 0}
              onClick={submit}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Envoyer votre demande
            </Button>
          </div>
        )}

        {/* ===== ONGLET VENTES ===== */}
        {mainTab === "ventes" && (
          <section className="mt-4 space-y-4 pb-36">
            {saleStep === "history" && (
              <>
                {/* Bouton déclarer */}
                {canQueryDriver && portalMode === "driver" && (
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white shadow-lg active:scale-[0.98] transition-transform touch-manipulation"
                    style={{ backgroundColor: ORANGE }}
                    onClick={() => {
                      setSaleCart({})
                      setSaleNotes("")
                      setSaleStep("declare")
                      if (stockLines.length === 0) loadStock()
                    }}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Déclarer mes ventes
                  </button>
                )}

                {/* Historique */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historique des déclarations</p>
                  {salesLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-7 w-7 animate-spin" style={{ color: ORANGE }} />
                    </div>
                  ) : sales.length === 0 ? (
                    <div className="text-center py-12">
                      <Receipt className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                      <p className="text-sm text-neutral-500 font-medium">Aucune déclaration pour l&apos;instant</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sales.map((sale) => (
                        <div key={sale.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">{new Date(sale.declaredAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            <span className="text-sm font-bold" style={{ color: ORANGE }}>
                              {formatPrice(sale.totalAmount)}
                            </span>
                          </div>
                          {/* Produits en carreaux */}
                          <div className="flex flex-wrap gap-2">
                            {sale.items.map((item) => (
                              <ProductTile
                                key={item.id}
                                photo={item.product.photos?.[0] ?? null}
                                name={item.product.name}
                                badge={item.quantity}
                                badgeBg={ORANGE}
                                sub={formatPrice(item.unitPrice)}
                                size="sm"
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-neutral-100 pt-2">
                            <span>{sale.items.length} article{sale.items.length > 1 ? "s" : ""}</span>
                            {sale.notes && <span className="italic truncate max-w-[60%]">« {sale.notes} »</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {saleStep === "declare" && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-gray-500 mb-2 touch-manipulation"
                  onClick={() => setSaleStep("history")}
                >
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <p className="text-sm font-semibold text-gray-700 mb-3">Sélectionnez les produits vendus</p>
                {stockLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-7 w-7 animate-spin" style={{ color: ORANGE }} />
                  </div>
                ) : stockLines.length === 0 ? (
                  <div className="text-center py-10">
                    <Package className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                    <p className="text-sm text-neutral-500">Votre stock est vide</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stockLines.map((s) => {
                      const key = s.product.id
                      const entry = saleCart[key] || { qty: 0, unitPrice: s.product.prixVente ?? 0 }
                      const inCart = entry.qty > 0
                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "rounded-2xl border p-3 shadow-sm transition-colors",
                            inCart ? "border-orange-300 bg-orange-50" : "border-neutral-200 bg-white",
                          )}
                        >
                          <div className="flex gap-3 items-center">
                            {/* Photo */}
                            <div className="h-14 w-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                              {firstPhoto(s) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={firstPhoto(s)!} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-6 w-6 text-neutral-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-1">{s.product.name}</p>
                              {s.variant && <p className="text-xs text-neutral-400">{s.variant.name}</p>}
                              <p className="text-xs text-neutral-400">Stock : {s.quantity}</p>
                            </div>
                          </div>
                          {/* Qté + Prix */}
                          <div className="mt-3 flex gap-2 items-center">
                            {/* Contrôles quantité */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSaleCart((c) => {
                                  const prev = c[key] || { qty: 0, unitPrice: s.product.prixVente ?? 0 }
                                  if (prev.qty <= 0) return c
                                  return { ...c, [key]: { ...prev, qty: prev.qty - 1 } }
                                })}
                                className="h-8 w-8 rounded-full border border-neutral-300 flex items-center justify-center touch-manipulation"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-sm font-bold tabular-nums w-6 text-center">{entry.qty}</span>
                              <button
                                type="button"
                                onClick={() => setSaleCart((c) => {
                                  const prev = c[key] || { qty: 0, unitPrice: s.product.prixVente ?? 0 }
                                  if (prev.qty >= s.quantity) return c
                                  return { ...c, [key]: { ...prev, qty: prev.qty + 1 } }
                                })}
                                className="h-8 w-8 rounded-full flex items-center justify-center text-white touch-manipulation"
                                style={{ backgroundColor: ORANGE }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {/* Prix unitaire */}
                            <div className="flex-1">
                              <Input
                                type="number"
                                min="0"
                                value={entry.unitPrice}
                                onChange={(e) => setSaleCart((c) => {
                                  const prev = c[key] || { qty: 0, unitPrice: s.product.prixVente ?? 0 }
                                  return { ...c, [key]: { ...prev, unitPrice: Number(e.target.value) || 0 } }
                                })}
                                placeholder="Prix unitaire"
                                className="h-9 text-sm rounded-xl"
                              />
                            </div>
                            {inCart && (
                              <p className="text-xs font-semibold shrink-0" style={{ color: ORANGE }}>
                                {formatPrice(entry.qty * entry.unitPrice)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {saleStep === "confirm" && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-gray-500 mb-2 touch-manipulation"
                  onClick={() => setSaleStep("declare")}
                >
                  <ChevronLeft className="h-4 w-4" /> Modifier
                </button>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-1">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Récapitulatif</p>
                  <p className="text-2xl font-bold" style={{ color: ORANGE }}>{formatPrice(saleTotalAmount)}</p>
                  <p className="text-xs text-orange-700">{saleCartLines.length} article{saleCartLines.length > 1 ? "s" : ""}</p>
                </div>
                {/* Carreaux produits */}
                <div className="grid grid-cols-4 gap-2">
                  {saleCartLines.map((l) => (
                    <ProductTile
                      key={l.productId}
                      photo={l.stock ? firstPhoto(l.stock) : null}
                      name={l.stock?.product.name ?? l.productId}
                      badge={l.qty}
                      badgeBg={ORANGE}
                      sub={formatPrice(l.unitPrice)}
                      size="md"
                    />
                  ))}
                </div>
                {/* Détail ligne par ligne */}
                <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
                  {saleCartLines.map((l) => (
                    <div key={l.productId} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-neutral-700 truncate flex-1">{l.stock?.product.name ?? l.productId}</span>
                      <span className="text-neutral-500 shrink-0 ml-2">{l.qty} × {formatPrice(l.unitPrice)}</span>
                      <span className="font-semibold ml-3 shrink-0" style={{ color: ORANGE }}>{formatPrice(l.qty * l.unitPrice)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 font-bold text-sm">
                    <span>Total</span>
                    <span style={{ color: ORANGE }}>{formatPrice(saleTotalAmount)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Note (optionnel)</label>
                  <Textarea
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    placeholder="Ex: Ventes du matin…"
                    rows={3}
                    className="mt-1 rounded-xl text-base"
                  />
                </div>
              </>
            )}
          </section>
        )}

        {/* Bouton Valider ventes — onglet ventes, étape declare */}
        {mainTab === "ventes" && saleStep === "declare" && saleCartLines.length > 0 && (
          <div
            className="fixed left-0 right-0 px-3 max-w-lg mx-auto z-50"
            style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              type="button"
              className="w-full h-14 text-base font-semibold rounded-2xl touch-manipulation text-white border-0 shadow-lg"
              style={{ backgroundColor: ORANGE }}
              onClick={() => setSaleStep("confirm")}
            >
              <Receipt className="h-5 w-5 mr-2" />
              Récapitulatif ({saleCartLines.length} article{saleCartLines.length > 1 ? "s" : ""})
            </Button>
          </div>
        )}

        {/* Bouton Confirmer ventes — étape confirm */}
        {mainTab === "ventes" && saleStep === "confirm" && (
          <div
            className="fixed left-0 right-0 px-3 max-w-lg mx-auto flex gap-2 z-50"
            style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              type="button"
              variant="outline"
              className="h-14 flex-1 rounded-2xl touch-manipulation shadow-md"
              onClick={() => setSaleStep("declare")}
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Modifier
            </Button>
            <Button
              type="button"
              className="h-14 flex-[2] text-base font-semibold rounded-2xl touch-manipulation text-white border-0 shadow-lg"
              style={{ backgroundColor: "#16a34a" }}
              disabled={saleSubmitting || saleCartLines.length === 0}
              onClick={submitSale}
            >
              {saleSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              Valider mes ventes
            </Button>
          </div>
        )}

        {/* Barre de navigation inférieure */}
        <nav
          className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 max-w-lg mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex justify-around items-stretch pt-2 pb-1">
            <button
              type="button"
              onClick={() => setMainTab("accueil")}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[4.5rem] py-1 touch-manipulation",
                mainTab === "accueil" ? "font-semibold" : "text-neutral-400",
              )}
              style={mainTab === "accueil" ? { color: ORANGE } : undefined}
            >
              <Home className={cn("h-6 w-6", mainTab !== "accueil" && "opacity-70")} />
              <span className="text-[11px]">Accueil</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMainTab("magasin")
                if (step === "store" && !selectedStore) {
                  /* keep store step */
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[4.5rem] py-1 touch-manipulation",
                mainTab === "magasin" ? "font-semibold" : "text-neutral-400",
              )}
              style={mainTab === "magasin" ? { color: ORANGE } : undefined}
            >
              <StoreIcon className={cn("h-6 w-6", mainTab !== "magasin" && "opacity-70")} />
              <span className="text-[11px]">Magasin</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab("stock")}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[4.5rem] py-1 touch-manipulation",
                mainTab === "stock" ? "font-semibold" : "text-neutral-400",
              )}
              style={mainTab === "stock" ? { color: ORANGE } : undefined}
            >
              <Wallet className={cn("h-6 w-6", mainTab !== "stock" && "opacity-70")} />
              <span className="text-[11px]">Stock</span>
            </button>
            <button
              type="button"
              onClick={() => { setMainTab("ventes"); setSaleStep("history") }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[4.5rem] py-1 touch-manipulation",
                mainTab === "ventes" ? "font-semibold" : "text-neutral-400",
              )}
              style={mainTab === "ventes" ? { color: ORANGE } : undefined}
            >
              <ShoppingBag className={cn("h-6 w-6", mainTab !== "ventes" && "opacity-70")} />
              <span className="text-[11px]">Ventes</span>
            </button>
          </div>
        </nav>
      </div>
    </HomeLayout>
  )
}
