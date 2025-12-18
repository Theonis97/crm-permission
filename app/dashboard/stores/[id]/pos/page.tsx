"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChangeCalculator } from "./components/ChangeCalculator"
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  User,
  Package,
  Loader2,
  Truck,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Receipt,
  Settings,
  Phone,
  Clock,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ThermalPrinterDialog } from "@/components/pos/thermal-printer-dialog"
import { usePrinterSettings } from "@/components/pos/printer-settings-dialog"
import { PosSettingsSheet } from "@/components/pos/pos-settings-sheet"
import type { TicketData } from "@/lib/thermal-printer"

interface Product {
  id: string
  storeProductId: string
  name: string
  sku: string | null
  description: string | null
  photos: string[]
  prixVente: number
  prixAchat: number
  tva: number
  stock: number
  minStock: number
  maxStock: number
  categoryId: string
  brandId: string | null
  category: {
    id: string
    name: string
  }
  brand: {
    id: string
    name: string
  } | null
}

interface Category {
  id: string
  name: string
  description: string | null
  _count: {
    products: number
  }
}

interface Brand {
  id: string
  name: string
  description: string | null
  logo: string | null
  _count: {
    products: number
  }
}

interface DeliveryPerson {
  id: string
  name: string
  phone: string
  status: "AVAILABLE" | "BUSY" | "OFFLINE"
}

const paymentMethods = [
  { id: "cash", label: "Espèces", icon: Banknote },
  { id: "card", label: "Carte", icon: CreditCard },
  { id: "mobile", label: "Mobile Money", icon: Smartphone },
]

interface CartItem {
  product: Product
  quantity: number
  discount?: number // Réduction en pourcentage (0-100)
  discountAmount?: number // Montant de réduction fixe en FCFA
}

const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('XAF', 'FCFA')
}

export default function PosPage() {
  const params = useParams()
  const storeId = params.id as string
  const { data: session } = useSession()

  // États
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(2) // Commence directement à l'étape 2 (récapitulatif)
  const [orderType, setOrderType] = useState<"CLIENT_DELIVERY" | "CLIENT_STORE" | "DRIVER">("CLIENT_STORE") // Mode vente directe par défaut

  // États pour l'impression
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [showPrinterSettings, setShowPrinterSettings] = useState(false)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const printerSettings = usePrinterSettings(storeId)

  // Données
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  const [storeInfo, setStoreInfo] = useState<any>(null)

  // Commandes sous-caisse
  const [subBoxOrders, setSubBoxOrders] = useState<any[]>([])
  const [isLoadingSubBoxOrders, setIsLoadingSubBoxOrders] = useState(true)
  const [subBoxOrderSearch, setSubBoxOrderSearch] = useState("")
  const [selectedSubBoxOrder, setSelectedSubBoxOrder] = useState<any>(null)

  // Loading states
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchingLocation, setSearchingLocation] = useState(false)

  // Formulaire checkout - Étape 1: Client
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState("")
  const [customerFirstName, setCustomerFirstName] = useState("")
  const [customerLastName, setCustomerLastName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  // Formulaire checkout - Étape 2: Livraison
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null)
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null)
  const [detectedZone, setDetectedZone] = useState<any>(null)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState("")
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(() => {
    // Par défaut, la date de livraison est aujourd'hui
    const today = new Date()
    return today.toISOString().split('T')[0] // Format YYYY-MM-DD
  })

  // Formulaire checkout - Étape 3: Paiement
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [notes, setNotes] = useState("")

  // Réductions
  const [globalDiscount, setGlobalDiscount] = useState(0) // Remise globale en pourcentage
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState(0) // Remise globale en montant fixe

  // Clôture de journée
  const [showDayCloseSheet, setShowDayCloseSheet] = useState(false)
  const [dayCloseSummary, setDayCloseSummary] = useState<any>(null)
  const [isLoadingDayClose, setIsLoadingDayClose] = useState(false)

  // BambooPay
  const [posPaymentMethod, setPosPaymentMethod] = useState<"ESPECE" | "BAMBOO_PAY">("ESPECE")
  const [bambooPayPhone, setBambooPayPhone] = useState("")
  const [bambooPayStatus, setBambooPayStatus] = useState<"idle" | "initiating" | "waiting" | "success" | "failed" | "timeout">("idle")
  const [bambooPayMessage, setBambooPayMessage] = useState("")
  const [bambooPayAttempt, setBambooPayAttempt] = useState(0)
  const [bambooPayReference, setBambooPayReference] = useState<string | null>(null)
  const bambooPayIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Refs
  const addressDropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Scanner de code-barres
  const barcodeBufferRef = useRef<string>("")
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Charger les données au montage
  useEffect(() => {
    loadProducts()
    loadCategories()
    loadBrands()
    loadDeliveryPersons()
    loadContacts()
    loadSubBoxOrders()
    loadDeliveryZones()
    loadStoreInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // Fermer la dropdown d'adresses au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(event.target as Node)) {
        setShowAddressSuggestions(false)
      }
    }

    if (showAddressSuggestions) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showAddressSuggestions])

  // Scanner de code-barres - Écoute les entrées clavier rapides (lecteur USB)
  useEffect(() => {
    let lastKeyTime = 0

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTime
      lastKeyTime = currentTime

      // Si c'est Enter, traiter le buffer s'il contient quelque chose
      if (event.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) { // Au moins 3 caractères pour un code valide
          event.preventDefault()
          event.stopPropagation()
          const scannedCode = barcodeBufferRef.current.trim()
          console.log('🔍 Code-barres scanné:', scannedCode)
          barcodeBufferRef.current = ""

          if (barcodeTimeoutRef.current) {
            clearTimeout(barcodeTimeoutRef.current)
            barcodeTimeoutRef.current = null
          }

          handleBarcodeScanned(scannedCode)
        }
        return
      }

      // Ignorer les touches de contrôle et spéciales
      if (event.key.length !== 1) {
        return
      }

      // Ignorer si on est dans un champ de saisie et que c'est une saisie lente (> 50ms entre touches)
      const target = event.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (isInputField && timeDiff > 50 && barcodeBufferRef.current.length === 0) {
        return
      }

      // Ajouter le caractère au buffer
      barcodeBufferRef.current += event.key

      // Réinitialiser le timeout
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current)
      }

      // Vider le buffer après 200ms d'inactivité (saisie manuelle probable)
      barcodeTimeoutRef.current = setTimeout(() => {
        if (barcodeBufferRef.current.length > 0) {
          console.log('⏱️ Buffer vidé (timeout):', barcodeBufferRef.current)
        }
        barcodeBufferRef.current = ""
      }, 200)
    }

    window.addEventListener('keydown', handleKeyDown, true) // Capture phase

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current)
      }
    }
  }, [products])

  // Fonction pour traiter un code-barres scanné
  const handleBarcodeScanned = (code: string) => {
    // Chercher le produit par SKU ou ID
    const product = products.find(p =>
      p.sku === code ||
      p.id === code ||
      p.sku?.toLowerCase() === code.toLowerCase()
    )

    if (product) {
      if (product.stock <= 0) {
        toast.error(`${product.name} - Stock épuisé !`)
        return
      }

      // Ajouter au panier
      setCart(prev => {
        const existingItem = prev.find(item => item.product.id === product.id)
        if (existingItem) {
          if (existingItem.quantity >= product.stock) {
            toast.warning(`Stock maximum atteint pour ${product.name}`)
            return prev
          }
          return prev.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
              : item
          )
        }
        return [...prev, { product, quantity: 1 }]
      })

      toast.success(`📦 ${product.name} scanné et ajouté au panier`)
    } else {
      toast.error(`Produit non trouvé : ${code}`)
    }
  }

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true)
      const response = await fetch(`/api/stores/${storeId}/products`)
      if (!response.ok) throw new Error("Erreur chargement produits")
      const data = await response.json()
      setProducts(data)
    } catch (error: any) {
      console.error("Error loading products:", error)
      toast.error("Erreur lors du chargement des produits")
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Erreur chargement catégories")
      const data = await response.json()
      setCategories(data.filter((c: Category) => !c.description?.includes("parent"))) // Filtrer les catégories principales
    } catch (error: any) {
      console.error("Error loading categories:", error)
      toast.error("Erreur lors du chargement des catégories")
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const loadBrands = async () => {
    try {
      setIsLoadingBrands(true)
      const response = await fetch("/api/brands")
      if (!response.ok) throw new Error("Erreur chargement marques")
      const data = await response.json()
      setBrands(data)
    } catch (error: any) {
      console.error("Error loading brands:", error)
      toast.error("Erreur lors du chargement des marques")
    } finally {
      setIsLoadingBrands(false)
    }
  }

  const loadDeliveryPersons = async () => {
    try {
      setIsLoadingDrivers(true)
      const response = await fetch(`/api/delivery-persons?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur chargement livreurs")
      const data = await response.json()
      setDeliveryPersons(data.filter((d: any) => d.isActive))
    } catch (error: any) {
      console.error("Error loading delivery persons:", error)
    } finally {
      setIsLoadingDrivers(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/contacts`)
      if (!response.ok) throw new Error("Erreur chargement contacts")
      const data = await response.json()
      setContacts(data)
    } catch (error: any) {
      console.error("Error loading contacts:", error)
    }
  }

  const loadDeliveryZones = async () => {
    try {
      const response = await fetch(`/api/delivery-zones?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur chargement zones")
      const data = await response.json()
      setDeliveryZones(data.filter((z: any) => z.isActive))
    } catch (error: any) {
      console.error("Error loading delivery zones:", error)
    }
  }

  const loadSubBoxOrders = async (search?: string) => {
    try {
      setIsLoadingSubBoxOrders(true)
      const searchParam = search || subBoxOrderSearch
      const url = `/api/stores/${storeId}/sub-box-orders?status=PENDING${searchParam ? `&search=${searchParam}` : ''}`
      console.log("[POS] Loading sub-box orders from:", url)
      const response = await fetch(url)
      const data = await response.json()
      console.log("[POS] Sub-box orders response:", data)
      if (!response.ok) throw new Error("Erreur chargement commandes sous-caisse")
      setSubBoxOrders(data.data || [])
    } catch (error: any) {
      console.error("Error loading sub-box orders:", error)
    } finally {
      setIsLoadingSubBoxOrders(false)
    }
  }

  const loadSubBoxOrderToCart = (order: any) => {
    // Vider le panier actuel
    setCart([])

    // Charger les produits de la commande dans le panier
    const newCartItems: CartItem[] = []

    for (const item of order.items) {
      // Trouver le produit correspondant dans la liste des produits
      const product = products.find(p => p.id === item.productId)

      if (product) {
        newCartItems.push({
          product,
          quantity: item.quantity,
        })
      } else {
        // Si le produit n'est pas trouvé, on le signale
        toast.error(`Produit "${item.name}" non trouvé dans le stock`)
      }
    }

    if (newCartItems.length > 0) {
      setCart(newCartItems)
      setSelectedSubBoxOrder(order)
      toast.success(`Commande ${order.clientCode} chargée (${newCartItems.length} article${newCartItems.length > 1 ? 's' : ''})`)
    }
  }

  const validateSubBoxOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/sub-box-orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "validate" }),
      })

      if (!response.ok) throw new Error("Erreur validation")

      // Recharger les commandes
      loadSubBoxOrders()
      setSelectedSubBoxOrder(null)
      toast.success("Commande sous-caisse validée")
    } catch (error) {
      toast.error("Erreur lors de la validation")
    }
  }

  const loadStoreInfo = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`)
      if (!response.ok) throw new Error("Erreur chargement magasin")
      const data = await response.json()
      setStoreInfo(data)

      // Mettre à jour les paramètres d'imprimante avec les infos du magasin
      const currentSettings = localStorage.getItem(`printer-settings-${storeId}`)
      if (!currentSettings) {
        // Première fois : initialiser avec les données du magasin
        const defaultSettings = {
          storeName: data.name || "Magasin",
          storeAddress: data.address || "",
          storePhone: data.phone || "",
          paperWidth: 58,
          autoprint: true,
          copies: 1,
          showLogo: false,
          footerMessage: "Merci de votre visite!\nA bientôt",
          showTaxDetails: true,
          showItemSKU: false,
          currencySymbol: "FCFA",
          showDecimals: false
        }
        localStorage.setItem(`printer-settings-${storeId}`, JSON.stringify(defaultSettings))
      }
    } catch (error: any) {
      console.error("Error loading store info:", error)
    }
  }

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.includes(product.categoryId)
      const matchesBrand = selectedBrand === "all" || product.brandId === selectedBrand

      return matchesSearch && matchesCategory && matchesBrand && product.stock > 0
    })
  }, [searchTerm, selectedCategories, selectedBrand, products])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Point-in-polygon algorithm pour détecter la zone
  const isPointInPolygon = (lat: number, lng: number, polygon: any[]) => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng
      const xj = polygon[j].lat, yj = polygon[j].lng
      const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  const detectDeliveryZone = (lat: number, lng: number) => {
    for (const zone of deliveryZones) {
      if (isPointInPolygon(lat, lng, zone.coordinates)) {
        setDetectedZone(zone)
        setDeliveryFee(zone.deliveryFee || 0)
        if (zone.deliveryPersonId) {
          setSelectedDeliveryPerson(zone.deliveryPersonId)
        }
        return zone
      }
    }
    setDetectedZone(null)
    setDeliveryFee(0)
    return null
  }

  // Autocomplétion d'adresses avec OpenStreetMap (avec debouncing)
  const handleAddressSearch = (query: string) => {
    setDeliveryAddress(query)

    // Clear le timer précédent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query.length < 3) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      setLoadingAddresses(false)
      return
    }

    setLoadingAddresses(true)

    // Debounce de 500ms
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Utiliser Nominatim avec countryCodes pour limiter aux pays pertinents (Gabon)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(query)}&` +
          `limit=5&` +
          `addressdetails=1&` +
          `countrycodes=ga`, // Gabon
          {
            headers: {
              'Accept-Language': 'fr',
            }
          }
        )
        const data = await response.json()

        setAddressSuggestions(data)
        setShowAddressSuggestions(data.length > 0)
      } catch (error: any) {
        console.error("Error fetching addresses:", error)
        setAddressSuggestions([])
        setShowAddressSuggestions(false)
      } finally {
        setLoadingAddresses(false)
      }
    }, 500) // Délai de 500ms
  }

  // Sélection d'une adresse depuis l'autocomplete
  const handleSelectAddress = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)

    setDeliveryAddress(suggestion.display_name)
    setDeliveryLatitude(lat)
    setDeliveryLongitude(lng)
    setShowAddressSuggestions(false)
    setAddressSuggestions([])

    // Détecter automatiquement la zone
    const zone = detectDeliveryZone(lat, lng)
    if (zone) {
      toast.success(`Zone détectée: ${zone.name} - Frais: ${zone.deliveryFee} FCFA`)
    } else {
      toast.warning("⚠️ Cette adresse n'est dans aucune zone de livraison configurée")
    }
  }

  const handleSelectContact = (contact: any) => {
    setSelectedContactId(contact.id)
    setCustomerFirstName(contact.firstName || "")
    setCustomerLastName(contact.lastName || "")
    setCustomerPhone(contact.phone || "")
    setCustomerEmail(contact.email || "")
    setContactSearch("")
  }

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide")
      return
    }

    // Validation selon le type de commande
    if (orderType === "CLIENT_DELIVERY") {
      if (!customerPhone) {
        toast.error("Téléphone du client requis")
        return
      }
    } else if (orderType === "DRIVER") {
      if (!selectedDeliveryPerson) {
        toast.error("Veuillez sélectionner un livreur")
        return
      }
    }

    try {
      setIsSubmitting(true)

      if (orderType === "DRIVER") {
        // Transférer le stock au livreur
        await handleTransferToDriver()
      } else if (orderType === "CLIENT_DELIVERY") {
        // Créer une commande client avec livraison (ne pas déstocker)
        await handleCreateClientDeliveryOrder()
      } else if (orderType === "CLIENT_STORE") {
        // Vente directe au magasin (déstocker et créer mouvement)
        await handleCreateClientStoreOrder()
      }
    } catch (error: any) {
      console.error("Error creating order:", error)
      toast.error(error.message || "Erreur lors de la création de la commande")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateClientDeliveryOrder = async () => {
    // Créer ou récupérer le contact
    let contactId = selectedContactId
    if (!contactId && (customerFirstName || customerLastName || customerPhone)) {
      // Créer le contact et l'associer automatiquement à la boutique
      const contactResponse = await fetch(`/api/stores/${storeId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: customerFirstName,
          lastName: customerLastName,
          phone: customerPhone,
          email: customerEmail || null,
          type: "PERSONNE",
          status: "CLIENT",
        }),
      })

      if (contactResponse.ok) {
        const newContact = await contactResponse.json()
        contactId = newContact.id

        // Recharger la liste des contacts pour inclure le nouveau
        loadContacts()
      }
    }

    const orderData = {
      storeId,
      contactId: contactId || null,
      customerName: `${customerFirstName} ${customerLastName}`.trim() || "Client",
      customerPhone,
      customerEmail: customerEmail || null,
      deliveryAddress: deliveryAddress || null,
      deliveryLatitude,
      deliveryLongitude,
      deliveryZoneId: detectedZone?.id || null,
      requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate).toISOString() : null,
      priority: "NORMAL",
      // Pour CLIENT_DELIVERY, on laisse null si aucun livreur sélectionné
      deliveryPersonId: selectedDeliveryPerson && selectedDeliveryPerson !== "none" ? selectedDeliveryPerson : null,
      deliveryFee,
      paymentMethod: paymentMethod.toUpperCase(),
      notes: notes + " [COMMANDE À LIVRER - NE PAS DÉSTOCKER LE MAGASIN]",
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.prixVente,
      })),
    }

    // Debug : Vérifier les données envoyées
    console.log('🔍 [POS] Données commande envoyées:', {
      deliveryZoneId: orderData.deliveryZoneId,
      detectedZone: detectedZone?.name,
      hasDeliveryAddress: !!orderData.deliveryAddress,
      customerName: orderData.customerName,
    })

    const response = await fetch("/api/store-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Erreur création commande")
    }

    const order = await response.json()
    toast.success(`Commande ${order.number} créée avec succès !`)

    // Réinitialiser
    resetCheckoutForm()
    clearCart()
    setIsCheckoutOpen(false)

    // Recharger les produits pour mettre à jour les stocks
    loadProducts()
  }

  const handleTransferToDriver = async () => {
    // Créer une demande d'approvisionnement au lieu d'un transfert direct
    const restockingRequestData = {
      storeId,
      deliveryPersonId: selectedDeliveryPerson,
      items: cart.map(item => ({
        productId: item.product.id,
        requestedQuantity: item.quantity,
        notes: `Demande depuis POS - ${item.product.name}`,
      })),
      notes: notes || "Demande d'approvisionnement créée depuis POS",
      priority: "HIGH", // Priorité haute car c'est depuis le POS
    }

    const response = await fetch(`/api/restocking-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restockingRequestData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Erreur lors de la création de la demande d'approvisionnement")
    }

    const result = await response.json()

    toast.success(`Demande d'approvisionnement créée avec succès ! (ID: ${result.data.id.slice(-8).toUpperCase()})`)

    // Réinitialiser
    resetCheckoutForm()
    clearCart()
    setIsCheckoutOpen(false)

    // Pas besoin de recharger les produits car c'est une demande, pas un transfert direct
  }

  const handleCreateClientStoreOrder = async () => {
    // Vérifier si le client est renseigné (au moins un champ rempli)
    const isCustomerProvided = customerFirstName.trim() || customerLastName.trim() || customerPhone.trim()

    // Valeurs par défaut si client non renseigné
    const defaultCustomerName = "Client"
    const defaultCustomerPhone = "+241xxxxxx"

    // Créer ou récupérer le contact seulement si le client est renseigné
    let contactId = selectedContactId
    if (!contactId && isCustomerProvided) {
      // Créer le contact et l'associer automatiquement à la boutique
      const contactResponse = await fetch(`/api/stores/${storeId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: customerFirstName || "Client",
          lastName: customerLastName || "",
          phone: customerPhone || defaultCustomerPhone,
          email: customerEmail || null,
          type: "PERSONNE",
          status: "CLIENT",
        }),
      })

      if (contactResponse.ok) {
        const newContact = await contactResponse.json()
        contactId = newContact.id

        // Recharger la liste des contacts pour inclure le nouveau
        loadContacts()
      }
    }

    // Créer directement une vente POS (pas de commande, juste des mouvements de stock)
    const saleData = {
      storeId,
      contactId: contactId || null,
      customerName: isCustomerProvided ? `${customerFirstName} ${customerLastName}`.trim() || defaultCustomerName : defaultCustomerName,
      customerPhone: isCustomerProvided ? customerPhone || defaultCustomerPhone : defaultCustomerPhone,
      customerEmail: customerEmail || null,
      paymentMethod: "CASH", // Toujours en espèces pour les ventes au magasin
      notes: notes || "Vente directe POS",
      items: cart.map(item => {
        const originalTotal = item.product.prixVente * item.quantity
        let itemDiscount = 0
        if (item.discount && item.discount > 0) {
          itemDiscount = originalTotal * (item.discount / 100)
        } else if (item.discountAmount && item.discountAmount > 0) {
          itemDiscount = Math.min(item.discountAmount, originalTotal)
        }
        return {
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.prixVente,
          discount: itemDiscount,
        }
      }),
      // Remise globale
      globalDiscount: globalDiscountApplied,
      // Flag pour indiquer si le client est anonyme (pour le ticket)
      isAnonymousCustomer: !isCustomerProvided,
    }

    const response = await fetch(`/api/stores/${storeId}/pos-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Erreur création vente")
    }

    const sale = await response.json()
    toast.success(`Vente ${sale.number || 'POS'} enregistrée avec succès !`)

    // Générer le ticket d'impression
    const ticket = generateTicketData(sale, saleData)
    setTicketData(ticket)

    // Impression automatique ou affichage du dialog selon les paramètres
    if (printerSettings.autoprint) {
      // Impression automatique
      try {
        const { thermalPrinter } = await import('@/lib/thermal-printer')
        await thermalPrinter.printTicket(ticket)
        toast.success('Ticket imprimé automatiquement !')
      } catch (error: any) {
        console.error('Erreur impression automatique:', error)
        toast.error('Erreur d\'impression automatique')
        // Fallback: afficher le dialog
        setShowPrintDialog(true)
      }
    } else {
      // Afficher le dialog d'impression
      setShowPrintDialog(true)
    }

    // Réinitialiser
    resetCheckoutForm()
    clearCart()
    setIsCheckoutOpen(false)

    // Recharger les produits pour mettre à jour les stocks
    loadProducts()
  }

  // Générer les données du ticket d'impression
  const generateTicketData = (sale: any, saleData: any): TicketData => {
    // Ne pas afficher les informations client si c'est un client anonyme
    const showCustomerInfo = !saleData.isAnonymousCustomer

    return {
      // Informations du magasin (utiliser storeInfo en priorité, puis les paramètres personnalisés)
      storeName: storeInfo?.name || printerSettings.storeName || "Magasin",
      storeAddress: storeInfo?.address || printerSettings.storeAddress || undefined,
      storePhone: storeInfo?.phone || printerSettings.storePhone || undefined,
      storeLogo: (printerSettings.showLogo && storeInfo?.logo) ? storeInfo.logo : undefined,

      // Informations de la vente
      ticketNumber: sale.number || `POS-${Date.now()}`,
      date: new Date(),
      cashier: session?.user?.name || "Caissier",

      // Client - masquer si client anonyme
      customerName: showCustomerInfo ? saleData.customerName : undefined,
      customerPhone: showCustomerInfo ? saleData.customerPhone : undefined,

      // Articles
      items: cart.map(item => ({
        name: item.product.name,
        sku: item.product.sku || undefined,
        quantity: item.quantity,
        unitPrice: item.product.prixVente,
        total: item.product.prixVente * item.quantity,
        discount: item.discount,
        discountAmount: item.discountAmount
      })),

      // Totaux
      subtotal: cartSubtotal,
      tax: cartTax,
      discount: globalDiscountApplied,
      total: cartTotal,

      // Paiement
      paymentMethod: saleData.paymentMethod || "CASH",

      // Notes
      notes: saleData.notes || undefined
    }
  }

  const resetCheckoutForm = () => {
    setCheckoutStep(2) // Revenir à l'étape 2 (récapitulatif)
    setOrderType("CLIENT_STORE") // Mode vente directe par défaut
    setSelectedContactId(null)
    setContactSearch("")
    setCustomerFirstName("")
    setCustomerLastName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setDeliveryAddress("")
    setAddressSuggestions([])
    setShowAddressSuggestions(false)
    setDeliveryLatitude(null)
    setDeliveryLongitude(null)
    setDetectedZone(null)
    setSelectedDeliveryPerson("")
    setDeliveryFee(0)
    // Réinitialiser la date de livraison à aujourd'hui
    const today = new Date()
    setRequestedDeliveryDate(today.toISOString().split('T')[0])
    setPaymentMethod("cash")
    setNotes("")
    // Réinitialiser les réductions
    setGlobalDiscount(0)
    setGlobalDiscountAmount(0)
    // Réinitialiser les réductions par article
    setCart(prev => prev.map(item => ({
      ...item,
      discount: undefined,
      discountAmount: undefined
    })))
    // Réinitialiser BambooPay
    resetBambooPayState()
  }

  // Réinitialiser l'état BambooPay
  const resetBambooPayState = () => {
    setPosPaymentMethod("ESPECE")
    setBambooPayPhone("")
    setBambooPayStatus("idle")
    setBambooPayMessage("")
    setBambooPayAttempt(0)
    setBambooPayReference(null)
    if (bambooPayIntervalRef.current) {
      clearInterval(bambooPayIntervalRef.current)
      bambooPayIntervalRef.current = null
    }
  }

  // Initier le paiement BambooPay
  const initiateBambooPayPayment = async () => {
    if (!bambooPayPhone.trim()) {
      toast.error("Veuillez saisir le numéro de téléphone pour le paiement")
      return
    }

    const totalAmount = finalSubtotal + cartTax

    try {
      setBambooPayStatus("initiating")
      setBambooPayMessage("Envoi de la demande de paiement...")

      const response = await fetch("/api/payments/bamboo-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: bambooPayPhone,
          amount: totalAmount,
          payerName: customerFirstName.trim() || customerLastName.trim()
            ? `${customerFirstName} ${customerLastName}`.trim()
            : "Client POS",
        }),
      })

      const data = await response.json()

      // Debug: Afficher la réponse complète
      console.log('🔍 [BambooPay] Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      })

      if (!response.ok) {
        // Erreur HTTP (400, 401, 500, etc.)
        setBambooPayStatus("failed")
        setBambooPayMessage(data.error || data.details || "Erreur lors de l'initiation du paiement")
        toast.error(data.error || data.details || "Erreur lors de l'initiation du paiement")
        return
      }

      if (data.success && data.referenceBp) {
        // data.referenceBp contient maintenant l'URL de redirection
        const redirectUrl = data.referenceBp

        setBambooPayReference(data.reference)
        setBambooPayStatus("waiting")
        setBambooPayMessage("Veuillez compléter le paiement sur la page Bamboo Pay...")

        // Ouvrir la page de paiement Bamboo Pay dans une popup
        const popup = window.open(
          redirectUrl,
          'BambooPay',
          'width=600,height=800,scrollbars=yes,resizable=yes'
        )

        if (!popup) {
          toast.error("Veuillez autoriser les popups pour ce site")
          setBambooPayStatus("failed")
          setBambooPayMessage("Impossible d'ouvrir la page de paiement")
        } else {
          toast.info("Page de paiement ouverte. Complétez le paiement sur Bamboo Pay.")
        }

        // Note : Le retour se fera via return_url configuré dans Bamboo Pay
        // Pas de polling nécessaire
      } else {
        setBambooPayStatus("failed")
        setBambooPayMessage(data.error || "Erreur lors de l'initiation du paiement")
        toast.error(data.error || "Erreur lors de l'initiation du paiement")
      }
    } catch (error: any) {
      console.error("Erreur BambooPay:", error)
      setBambooPayStatus("failed")
      setBambooPayMessage("Erreur de connexion au service de paiement")
      toast.error("Erreur de connexion au service de paiement")
    }
  }

  // Polling pour vérifier le statut du paiement BambooPay
  const startBambooPayPolling = (transactionId: string) => {
    const MAX_ATTEMPTS = 6 // 6 tentatives = 1 minute (10s x 6)
    let currentAttempt = 1

    // Vérifier immédiatement
    checkBambooPayStatus(transactionId, currentAttempt, MAX_ATTEMPTS)

    // Puis toutes les 10 secondes
    bambooPayIntervalRef.current = setInterval(async () => {
      currentAttempt++
      setBambooPayAttempt(currentAttempt)

      if (currentAttempt > MAX_ATTEMPTS) {
        // Timeout atteint
        if (bambooPayIntervalRef.current) {
          clearInterval(bambooPayIntervalRef.current)
          bambooPayIntervalRef.current = null
        }
        setBambooPayStatus("timeout")
        setBambooPayMessage("Délai d'attente dépassé. Le paiement n'a pas été confirmé.")
        toast.error("Délai d'attente dépassé pour le paiement BambooPay")
        return
      }

      await checkBambooPayStatus(transactionId, currentAttempt, MAX_ATTEMPTS)
    }, 10000) // 10 secondes
  }

  // Vérifier le statut d'un paiement BambooPay
  const checkBambooPayStatus = async (transactionId: string, attempt: number, maxAttempts: number) => {
    try {
      setBambooPayMessage(`Vérification du paiement... (${attempt}/${maxAttempts})`)

      const response = await fetch(`/api/payments/bamboo-pay?transactionId=${transactionId}`)
      const data = await response.json()

      if (data.status === "completed") {
        // Paiement confirmé !
        if (bambooPayIntervalRef.current) {
          clearInterval(bambooPayIntervalRef.current)
          bambooPayIntervalRef.current = null
        }
        setBambooPayStatus("success")
        setBambooPayMessage("Paiement confirmé !")
        toast.success("Paiement BambooPay confirmé !")

        // Lancer automatiquement la création de la vente et l'impression
        await handleCreateClientStoreOrderAfterBambooPay()
      } else if (data.status === "failed") {
        // Paiement échoué
        if (bambooPayIntervalRef.current) {
          clearInterval(bambooPayIntervalRef.current)
          bambooPayIntervalRef.current = null
        }
        setBambooPayStatus("failed")
        setBambooPayMessage(data.message || "Le paiement a échoué")
        toast.error(data.message || "Le paiement BambooPay a échoué")
      }
      // Si "pending", on continue le polling
    } catch (error: any) {
      console.error("Erreur vérification statut:", error)
      // Ne pas arrêter le polling en cas d'erreur réseau temporaire
    }
  }

  // Créer la vente après confirmation du paiement BambooPay
  const handleCreateClientStoreOrderAfterBambooPay = async () => {
    try {
      setIsSubmitting(true)

      // Vérifier si le client est renseigné
      const isCustomerProvided = customerFirstName.trim() || customerLastName.trim() || customerPhone.trim()
      const defaultCustomerName = "Client"
      const defaultCustomerPhone = "+241xxxxxx"

      // Créer ou récupérer le contact
      let contactId = selectedContactId
      if (!contactId && isCustomerProvided) {
        const contactResponse = await fetch(`/api/stores/${storeId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: customerFirstName || "Client",
            lastName: customerLastName || "",
            phone: customerPhone || bambooPayPhone || defaultCustomerPhone,
            email: customerEmail || null,
            type: "PERSONNE",
            status: "CLIENT",
          }),
        })

        if (contactResponse.ok) {
          const newContact = await contactResponse.json()
          contactId = newContact.id
          loadContacts()
        }
      }

      // Créer la vente POS avec paiement BambooPay
      const saleData = {
        storeId,
        contactId: contactId || null,
        customerName: isCustomerProvided ? `${customerFirstName} ${customerLastName}`.trim() || defaultCustomerName : defaultCustomerName,
        customerPhone: isCustomerProvided ? customerPhone || bambooPayPhone || defaultCustomerPhone : defaultCustomerPhone,
        customerEmail: customerEmail || null,
        paymentMethod: "MOBILE",
        paymentReference: bambooPayReference,
        notes: notes || `Vente POS - Paiement BambooPay (Ref: ${bambooPayReference})`,
        items: cart.map(item => {
          const originalTotal = item.product.prixVente * item.quantity
          let itemDiscount = 0
          if (item.discount && item.discount > 0) {
            itemDiscount = originalTotal * (item.discount / 100)
          } else if (item.discountAmount && item.discountAmount > 0) {
            itemDiscount = Math.min(item.discountAmount, originalTotal)
          }
          return {
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.prixVente,
            discount: itemDiscount,
          }
        }),
        globalDiscount: globalDiscountApplied,
        isAnonymousCustomer: !isCustomerProvided,
      }

      const response = await fetch(`/api/stores/${storeId}/pos-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur création vente")
      }

      const sale = await response.json()
      toast.success(`Vente ${sale.number || 'POS'} enregistrée avec succès !`)

      // Générer le ticket d'impression
      const ticket = generateTicketData(sale, saleData)
      setTicketData(ticket)

      // Impression automatique
      if (printerSettings.autoprint) {
        try {
          const { thermalPrinter } = await import('@/lib/thermal-printer')
          await thermalPrinter.printTicket(ticket)
          toast.success('Ticket imprimé automatiquement !')
        } catch (error: any) {
          console.error('Erreur impression automatique:', error)
          toast.error('Erreur d\'impression automatique')
          setShowPrintDialog(true)
        }
      } else {
        setShowPrintDialog(true)
      }

      // Réinitialiser
      resetCheckoutForm()
      clearCart()
      setIsCheckoutOpen(false)
      loadProducts()
    } catch (error: any) {
      console.error("Erreur création vente BambooPay:", error)
      toast.error(error.message || "Erreur lors de la création de la vente")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Annuler le paiement BambooPay en cours
  const cancelBambooPayPayment = () => {
    if (bambooPayIntervalRef.current) {
      clearInterval(bambooPayIntervalRef.current)
      bambooPayIntervalRef.current = null
    }
    resetBambooPayState()
    toast.info("Paiement BambooPay annulé")
  }

  // Nettoyer l'intervalle au démontage
  useEffect(() => {
    return () => {
      if (bambooPayIntervalRef.current) {
        clearInterval(bambooPayIntervalRef.current)
      }
    }
  }, [])

  const canProceedToStep2 = () => {
    if (orderType === "CLIENT_DELIVERY") {
      return customerPhone.trim().length > 0
    }
    // Pour CLIENT_STORE et DRIVER, pas d'étape 2 de livraison
    return false
  }

  const canProceedToStep3 = () => {
    if (orderType === "CLIENT_DELIVERY") {
      return deliveryAddress.trim().length > 0
    }
    return false
  }

  const canSubmitDriverOrder = () => {
    return selectedDeliveryPerson !== ""
  }

  // Calculs du panier avec réductions
  const cartSubtotal = cart.reduce((sum, item) => {
    const itemPrice = item.product.prixVente
    const itemTotal = itemPrice * item.quantity

    // Appliquer la réduction par article
    let discountedTotal = itemTotal
    if (item.discount && item.discount > 0) {
      discountedTotal = itemTotal * (1 - item.discount / 100)
    } else if (item.discountAmount && item.discountAmount > 0) {
      discountedTotal = Math.max(0, itemTotal - item.discountAmount)
    }

    return sum + discountedTotal
  }, 0)

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const cartTax = cart.reduce((sum, item) => {
    const itemPrice = item.product.prixVente
    const itemTotal = itemPrice * item.quantity

    // Appliquer la réduction par article pour calculer la TVA sur le montant réduit
    let discountedTotal = itemTotal
    if (item.discount && item.discount > 0) {
      discountedTotal = itemTotal * (1 - item.discount / 100)
    } else if (item.discountAmount && item.discountAmount > 0) {
      discountedTotal = Math.max(0, itemTotal - item.discountAmount)
    }

    return sum + (discountedTotal * item.product.tva / 100)
  }, 0)

  // Appliquer la remise globale
  let finalSubtotal = cartSubtotal
  let globalDiscountApplied = 0

  if (globalDiscount > 0) {
    globalDiscountApplied = cartSubtotal * (globalDiscount / 100)
    finalSubtotal = cartSubtotal - globalDiscountApplied
  } else if (globalDiscountAmount > 0) {
    globalDiscountApplied = Math.min(globalDiscountAmount, cartSubtotal)
    finalSubtotal = cartSubtotal - globalDiscountApplied
  }

  const cartTotal = finalSubtotal + cartTax + deliveryFee

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    toast.success(`${product.name} ajouté au panier`)
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(newQuantity, item.product.stock) }
          : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  // Fonctions pour gérer les réductions par article
  const updateItemDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, discount: Math.max(0, Math.min(100, discount)), discountAmount: undefined }
        : item
    ))
  }

  const updateItemDiscountAmount = (productId: string, discountAmount: number) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, discountAmount: Math.max(0, discountAmount), discount: undefined }
        : item
    ))
  }

  // Générer un ticket de clôture de journée
  const generateDayCloseTicket = (summary: any): TicketData => {
    const currentSettings = localStorage.getItem(`printer-settings-${storeId}`)
    const settings = currentSettings ? JSON.parse(currentSettings) : {}

    return {
      // Informations du magasin (utiliser storeInfo en priorité)
      storeName: storeInfo?.name || settings.storeName || "Magasin",
      storeAddress: storeInfo?.address || settings.storeAddress || undefined,
      storePhone: storeInfo?.phone || settings.storePhone || undefined,
      storeLogo: (settings.showLogo && storeInfo?.logo) ? storeInfo.logo : undefined,

      // Informations de la clôture
      ticketNumber: `CLOSE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      cashier: session?.user?.name || "Caissier",

      // Client (clôture de journée)
      customerName: "CLÔTURE DE JOURNÉE",

      // Articles (résumé des ventes)
      items: [
        {
          name: "NOMBRE DE VENTES",
          quantity: summary.totalSales || 0,
          unitPrice: 0,
          total: 0
        },
        {
          name: "ARTICLES VENDUS",
          quantity: summary.totalItems || 0,
          unitPrice: 0,
          total: 0
        },
        {
          name: "CHIFFRE D'AFFAIRES",
          quantity: 1,
          unitPrice: summary.totalRevenue || 0,
          total: summary.totalRevenue || 0
        }
      ],

      // Totaux
      subtotal: summary.totalRevenue || 0,
      tax: 0,
      discount: 0,
      total: summary.totalRevenue || 0,

      // Paiement
      paymentMethod: "ESPECES",

      // Notes spéciales pour la clôture
      notes: `Journée du ${new Date().toLocaleDateString('fr-FR')}\nPériode: ${summary.startTime || '00:00'} - ${summary.endTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n\nDétail des ventes:\n${summary.sales?.slice(0, 5).map((sale: any, index: number) => `${index + 1}. ${sale.customerName || 'Client'} - ${formatFCFA(sale.total)}`).join('\n') || 'Aucune vente'}${summary.sales?.length > 5 ? `\n... et ${summary.sales.length - 5} autres` : ''}`
    }
  }

  // Fonction pour clôturer la journée et imprimer directement
  const handleDayClose = async () => {
    setIsLoadingDayClose(true)
    try {
      // 1. Enregistrer la clôture en backend
      const closeResponse = await fetch(`/api/stores/${storeId}/day-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!closeResponse.ok) {
        throw new Error('Erreur lors de l\'enregistrement de la clôture')
      }

      const closeData = await closeResponse.json()
      toast.success(closeData.isUpdate ? 'Clôture mise à jour avec succès !' : 'Journée clôturée avec succès !')

      // 2. Récupérer le résumé pour l'impression
      const summaryResponse = await fetch(`/api/stores/${storeId}/day-close-summary`)
      if (!summaryResponse.ok) {
        throw new Error('Erreur lors du chargement du résumé')
      }

      const summaryData = await summaryResponse.json()

      // 3. Générer et imprimer directement le ticket de clôture
      const closeTicket = generateDayCloseTicket(summaryData)

      try {
        const { thermalPrinter } = await import('@/lib/thermal-printer')
        await thermalPrinter.printTicket(closeTicket)
        toast.success('Ticket de clôture imprimé avec succès !')
      } catch (printError) {
        console.error('Erreur impression clôture:', printError)
        toast.error('Journée clôturée mais erreur d\'impression du ticket')
      }

      // 4. Mettre à jour l'état pour afficher le résumé
      setDayCloseSummary(summaryData)
      setShowDayCloseSheet(true)

    } catch (error: any) {
      console.error('Erreur:', error)
      toast.error(error?.message || 'Erreur lors de la clôture de la journée')
    } finally {
      setIsLoadingDayClose(false)
    }
  }

  // Fonction pour charger le résumé de clôture de journée (sans clôturer)
  const loadDayCloseSummary = async () => {
    setIsLoadingDayClose(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/day-close-summary`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du résumé')
      }
      const data = await response.json()
      setDayCloseSummary(data)
      setShowDayCloseSheet(true)
    } catch (error: any) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du résumé de la journée')
    } finally {
      setIsLoadingDayClose(false)
    }
  }

  // CORRECTION STALE CLOSURE : Synchroniser la ref de création de commande à chaque rendu
  const handleCreateOrderRef = useRef(handleCreateClientStoreOrderAfterBambooPay)
  useEffect(() => {
    handleCreateOrderRef.current = handleCreateClientStoreOrderAfterBambooPay
  })

  // Réintroduction du listener Bamboo Pay avec le fix
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Vérifier l'origine pour la sécurité
      if (event.origin !== window.location.origin) {
        return
      }

      // Vérifier que c'est un message Bamboo Pay
      if (event.data?.type === 'BAMBOO_PAY_RETURN') {
        const { status, ref } = event.data

        console.log('🔔 [POS] Message reçu de Bamboo Pay:', { status, ref })

        if (status === 'completed') {
          // Paiement réussi
          setBambooPayStatus('success')
          setBambooPayMessage('Paiement confirmé !')
          toast.success('Paiement Bamboo Pay confirmé !')

          console.log("🛒 [POS] Appel de handleCreateOrderRef.current()")
          // Appel via la ref pour avoir la fonction AVEC le panier à jour
          if (handleCreateOrderRef.current) {
            await handleCreateOrderRef.current()
          }
        } else if (status === 'failed') {
          // Paiement échoué
          setBambooPayStatus('failed')
          setBambooPayMessage('Le paiement a échoué')
          toast.error('Le paiement Bamboo Pay a échoué')
        } else if (status === 'pending') {
          // Paiement en attente
          setBambooPayStatus('waiting')
          setBambooPayMessage('Paiement en attente...')
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Section Gauche - Produits */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Barre de recherche - 4 colonnes */}
            <div className="col-span-4 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un produit..."
                className="pl-10 border-gray-200 h-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Catégories - 8 colonnes avec scroll strict */}
            <div className="col-span-8 flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap flex-shrink-0">Catégories:</span>
              <div className="flex-1 overflow-hidden">
                <div
                  className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  } as React.CSSProperties}
                >
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0",
                        selectedCategories.includes(category.id)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Commandes Sous-Caisse */}
          <div className="w-56 bg-white border-r flex flex-col">
            {/* Header */}
            <div className="p-3 border-b bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Sous-Caisses</h3>
                  <p className="text-[10px] text-gray-500">{subBoxOrders.length} en attente</p>
                </div>
              </div>

              {/* Recherche par code client */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Code client..."
                  value={subBoxOrderSearch}
                  onChange={(e) => {
                    setSubBoxOrderSearch(e.target.value)
                    loadSubBoxOrders(e.target.value)
                  }}
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>

            {/* Liste des commandes */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {isLoadingSubBoxOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                </div>
              ) : subBoxOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">Aucune commande en attente</p>
                </div>
              ) : (
                subBoxOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => loadSubBoxOrderToCart(order)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all hover:shadow-md",
                      selectedSubBoxOrder?.id === order.id
                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                        : "border-gray-200 hover:border-orange-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-base text-gray-900">{order.clientCode}</span>
                      <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        En attente
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1">
                      <span>{order.subBox?.name || "Sous-caisse"}</span>
                      <span>•</span>
                      <span>{order.totalItems} article{order.totalItems > 1 ? "s" : ""}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-900">
                        {order.subtotal?.toLocaleString()} F
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer - Clôture de journée */}
            <div className="p-2 border-t">
              <button
                onClick={handleDayClose}
                disabled={isLoadingDayClose}
                className={cn(
                  "w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-xs font-medium",
                  dayCloseSummary?.isAlreadyClosed
                    ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                    : "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200"
                )}
              >
                {isLoadingDayClose ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : dayCloseSummary?.isAlreadyClosed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {dayCloseSummary?.isAlreadyClosed ? "Mettre à jour" : "Clôturer la journée"}
              </button>
            </div>
          </div>

          {/* Grille des Produits */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                {selectedCategories.length === 0 ? "Tous les articles" :
                  selectedCategories.length === 1 ? categories.find(c => c.id === selectedCategories[0])?.name :
                    `${selectedCategories.length} catégories sélectionnées`}
              </h2>
              <p className="text-xs text-gray-500">
                {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
              </p>
            </div>

            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-600">Chargement des produits...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-sm">Aucun produit disponible</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="relative bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => addToCart(product)}
                  >
                    {product.stock <= product.minStock && (
                      <div className="absolute -top-1 -left-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        Bas
                      </div>
                    )}

                    <div className="text-center">
                      {product.photos && product.photos.length > 0 ? (
                        <img
                          src={product.photos[0]}
                          alt={product.name}
                          className="w-full h-16 object-contain mb-2"
                        />
                      ) : (
                        <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                          <Package className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                      <h3 className="font-medium text-xs text-gray-900 mb-1 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <p className="text-[10px] text-gray-500 mb-1">{product.brand.name}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-blue-600 font-bold text-sm">
                          {product.prixVente} F
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Stock: {product.stock}
                        </div>
                      </div>
                    </div>

                    <button className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Section Droite - Panier */}
          <div className="w-92 bg-white border-l flex flex-col">
            {/* Header Panier */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Panier</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrinterSettings(true)}
                    className="h-7 w-7 p-0"
                    title="Configuration d'imprimante"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Badge variant="outline">{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</Badge>
                </div>
              </div>
            </div>

            {/* Items du Panier */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Panier vide</p>
                    <p className="text-xs mt-1">Ajoutez des produits</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      {item.product.photos && item.product.photos.length > 0 ? (
                        <img
                          src={item.product.photos[0]}
                          alt={item.product.name}
                          className="w-10 h-10 object-contain bg-white rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-300" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs text-gray-900 truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-xs text-gray-500">
                          {item.product.prixVente} F x {item.quantity}
                        </div>

                        {/* Réduction par article - uniquement montant fixe */}
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="number"
                            placeholder="Remise FCFA"
                            value={item.discountAmount || ''}
                            onChange={(e) => updateItemDiscountAmount(item.product.id, Number(e.target.value))}
                            className="h-7 text-xs w-24"
                            min="0"
                          />
                        </div>

                        <div className="flex items-center gap-1 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateQuantity(item.product.id, item.quantity - 1)
                            }}
                            className="w-5 h-5 bg-white border rounded flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="h-2 w-2" />
                          </button>

                          <span className="w-6 text-center text-xs font-medium">
                            {item.quantity}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateQuantity(item.product.id, item.quantity + 1)
                            }}
                            disabled={item.quantity >= item.product.stock}
                            className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-2 w-2" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="space-y-1">
                          {/* Prix original */}
                          <div className={cn(
                            "text-xs",
                            (item.discount || item.discountAmount) ? "line-through text-gray-400" : "font-bold text-gray-900"
                          )}>
                            {(item.product.prixVente * item.quantity).toLocaleString()} F
                          </div>

                          {/* Prix avec réduction */}
                          {(item.discount || item.discountAmount) && (
                            <div className="font-bold text-sm text-green-600">
                              {(() => {
                                const originalTotal = item.product.prixVente * item.quantity
                                let discountedTotal = originalTotal
                                if (item.discount && item.discount > 0) {
                                  discountedTotal = originalTotal * (1 - item.discount / 100)
                                } else if (item.discountAmount && item.discountAmount > 0) {
                                  discountedTotal = Math.max(0, originalTotal - item.discountAmount)
                                }
                                return discountedTotal.toLocaleString()
                              })()} F
                            </div>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFromCart(item.product.id)
                          }}
                          className="text-red-500 hover:text-red-600 mt-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Panier - Total */}
            {cart.length > 0 && (
              <div className="border-t p-3 space-y-3">
                {/* Calculateur de monnaie (Remplace la remise globale) */}
                <ChangeCalculator totalToPay={cartTotal} />

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-medium">{cartSubtotal.toLocaleString()} F</span>
                  </div>

                  {/* Afficher la remise globale si applicable */}
                  {globalDiscountApplied > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remise globale</span>
                      <span>-{globalDiscountApplied.toLocaleString()} F</span>
                    </div>
                  )}



                  <Separator />
                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span>Total</span>
                    <span className="text-blue-600">{cartTotal.toLocaleString()} F</span>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="space-y-2">
                  {/* Bouton de validation */}
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                    onClick={() => setIsCheckoutOpen(true)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Valider la commande
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Checkout Multi-étapes */}
      <Dialog open={isCheckoutOpen} onOpenChange={(open) => {
        setIsCheckoutOpen(open)
        if (!open) resetCheckoutForm()
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">Vente au magasin</DialogTitle>
            <DialogDescription>
              {checkoutStep === 1 && "Renseignez les informations du client"}
              {checkoutStep === 2 && "Confirmez le paiement"}
            </DialogDescription>
          </DialogHeader>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* ÉTAPE 1: Informations client */}
            {checkoutStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Rechercher un client existant
                  </h3>
                  <Input
                    placeholder="Rechercher par nom, téléphone ou email..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />

                  {contactSearch && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {contacts
                        .filter(storeContact => {
                          const c = storeContact.contact
                          return c.firstName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                            c.lastName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                            c.phone?.includes(contactSearch) ||
                            c.email?.toLowerCase().includes(contactSearch.toLowerCase())
                        })
                        .slice(0, 5)
                        .map((storeContact) => (
                          <button
                            key={storeContact.contact.id}
                            onClick={() => handleSelectContact(storeContact.contact)}
                            className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-medium">{storeContact.contact.firstName} {storeContact.contact.lastName}</div>
                            <div className="text-sm text-gray-600">{storeContact.contact.phone} {storeContact.contact.email && `• ${storeContact.contact.email}`}</div>
                          </button>
                        ))}
                      {contacts.filter(storeContact => {
                        const c = storeContact.contact
                        return c.firstName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                          c.lastName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                          c.phone?.includes(contactSearch) ||
                          c.email?.toLowerCase().includes(contactSearch.toLowerCase())
                      }).length === 0 && (
                          <div className="p-4 text-center text-gray-500 text-sm">Aucun client trouvé</div>
                        )}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold">Ou créer un nouveau client</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="customerFirstName">Prénom</Label>
                      <Input
                        id="customerFirstName"
                        placeholder="Ex: Jean"
                        value={customerFirstName}
                        onChange={(e) => setCustomerFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerLastName">Nom</Label>
                      <Input
                        id="customerLastName"
                        placeholder="Ex: Dupont"
                        value={customerLastName}
                        onChange={(e) => setCustomerLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Téléphone *</Label>
                    <Input
                      id="customerPhone"
                      placeholder="Ex: +237 690000000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email (optionnel)</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="Ex: client@email.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 2: Paiement direct */}
            {checkoutStep === 2 && (
              <div className="space-y-4">
                {/* Sélection du mode de paiement */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Mode de paiement</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option Espèces */}
                    <button
                      type="button"
                      onClick={() => {
                        setPosPaymentMethod("ESPECE")
                        resetBambooPayState()
                      }}
                      disabled={bambooPayStatus === "waiting" || bambooPayStatus === "initiating"}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                        posPaymentMethod === "ESPECE"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300",
                        (bambooPayStatus === "waiting" || bambooPayStatus === "initiating") && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        posPaymentMethod === "ESPECE" ? "bg-green-100" : "bg-gray-100"
                      )}>
                        <Banknote className={cn(
                          "h-5 w-5",
                          posPaymentMethod === "ESPECE" ? "text-green-600" : "text-gray-500"
                        )} />
                      </div>
                      <div className="text-left">
                        <div className={cn(
                          "font-medium",
                          posPaymentMethod === "ESPECE" ? "text-green-900" : "text-gray-700"
                        )}>
                          Espèces
                        </div>
                        <div className="text-xs text-gray-500">Paiement en cash</div>
                      </div>
                    </button>

                    {/* Option BambooPay */}
                    <button
                      type="button"
                      onClick={() => setPosPaymentMethod("BAMBOO_PAY")}
                      disabled={bambooPayStatus === "waiting" || bambooPayStatus === "initiating"}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                        posPaymentMethod === "BAMBOO_PAY"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300",
                        (bambooPayStatus === "waiting" || bambooPayStatus === "initiating") && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        posPaymentMethod === "BAMBOO_PAY" ? "bg-blue-100" : "bg-gray-100"
                      )}>
                        <Smartphone className={cn(
                          "h-5 w-5",
                          posPaymentMethod === "BAMBOO_PAY" ? "text-blue-600" : "text-gray-500"
                        )} />
                      </div>
                      <div className="text-left">
                        <div className={cn(
                          "font-medium",
                          posPaymentMethod === "BAMBOO_PAY" ? "text-blue-900" : "text-gray-700"
                        )}>
                          Bamboo Pay
                        </div>
                        <div className="text-xs text-gray-500">Mobile Money</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section BambooPay - Saisie du numéro */}
                {posPaymentMethod === "BAMBOO_PAY" && bambooPayStatus === "idle" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Numéro de téléphone pour le paiement</h4>
                    </div>

                    <Input
                      type="tel"
                      placeholder="Ex: 077 00 00 00"
                      value={bambooPayPhone}
                      onChange={(e) => setBambooPayPhone(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                )}

                {/* Section BambooPay - En cours d'initiation */}
                {posPaymentMethod === "BAMBOO_PAY" && bambooPayStatus === "initiating" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                      <div>
                        <h4 className="font-medium text-blue-900">Envoi de la demande...</h4>
                        <p className="text-sm text-blue-700">{bambooPayMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section BambooPay - En attente de validation */}
                {posPaymentMethod === "BAMBOO_PAY" && bambooPayStatus === "waiting" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Clock className="h-6 w-6 text-yellow-600" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-900">Paiement en cours</h4>
                        <p className="text-sm text-yellow-700">{bambooPayMessage}</p>
                      </div>
                    </div>
                    <div className="bg-yellow-100 rounded p-3 text-sm text-yellow-800">
                      💡 Complétez le paiement sur la page Bamboo Pay qui s'est ouverte.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelBambooPayPayment}
                      className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler le paiement
                    </Button>
                  </div>
                )}

                {/* Section BambooPay - Succès */}
                {posPaymentMethod === "BAMBOO_PAY" && bambooPayStatus === "success" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">Paiement confirmé !</h4>
                        <p className="text-sm text-green-700">Référence: {bambooPayReference}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section BambooPay - Échec ou Timeout */}
                {posPaymentMethod === "BAMBOO_PAY" && (bambooPayStatus === "failed" || bambooPayStatus === "timeout") && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-900">
                          {bambooPayStatus === "timeout" ? "Délai dépassé" : "Paiement échoué"}
                        </h4>
                        <p className="text-sm text-red-700">{bambooPayMessage}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetBambooPayState}
                      className="w-full border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Réessayer
                    </Button>
                  </div>
                )}


                <Separator />

                {/* Récapitulatif vente directe */}
                <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-purple-900">Récapitulatif de la vente</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">
                        {(customerFirstName.trim() || customerLastName.trim() || customerPhone.trim())
                          ? `${customerFirstName} ${customerLastName}${customerPhone ? ` • ${customerPhone}` : ''}`.trim()
                          : <span className="text-gray-400 italic">Client anonyme</span>
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-purple-700">Vente directe POS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paiement:</span>
                      <span className={cn(
                        "font-medium",
                        posPaymentMethod === "ESPECE" ? "text-green-700" : "text-blue-700"
                      )}>
                        {posPaymentMethod === "ESPECE" ? "Espèces" : "Bamboo Pay"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Articles ({cartItemsCount})</span>
                      <span>{cartSubtotal.toLocaleString()} FCFA</span>
                    </div>

                    {/* Afficher la remise globale si applicable */}
                    {globalDiscountApplied > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Remise globale</span>
                        <span>-{globalDiscountApplied.toLocaleString()} FCFA</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>TVA</span>
                      <span>{cartTax.toLocaleString()} FCFA</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold pt-2">
                      <span>Total à encaisser</span>
                      <span className="text-purple-600">{(finalSubtotal + cartTax).toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer fixe avec boutons de navigation */}
          <div className="shrink-0 border-t bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              {/* Bouton Annuler */}
              <Button
                variant="outline"
                onClick={() => {
                  if (bambooPayStatus === "waiting" || bambooPayStatus === "initiating") {
                    cancelBambooPayPayment()
                  }
                  setIsCheckoutOpen(false)
                  resetCheckoutForm()
                }}
                disabled={isSubmitting}
              >
                Annuler
              </Button>

              {/* Bouton d'action selon le mode de paiement */}
              {posPaymentMethod === "ESPECE" ? (
                // Paiement en espèces - Lancer directement l'impression
                <Button
                  onClick={handleCreateOrder}
                  disabled={isSubmitting}
                  className="w-[300px] bg-purple-600 hover:bg-purple-700 h-10"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Vente en cours...
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      Encaisser
                    </>
                  )}
                </Button>
              ) : (
                // Paiement BambooPay
                <>
                  {bambooPayStatus === "idle" && (
                    <Button
                      onClick={initiateBambooPayPayment}
                      disabled={!bambooPayPhone.trim() || isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Envoyer la demande de paiement
                    </Button>
                  )}
                  {(bambooPayStatus === "initiating" || bambooPayStatus === "waiting") && (
                    <Button
                      disabled
                      className="bg-yellow-600"
                    >
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      En attente de paiement...
                    </Button>
                  )}
                  {bambooPayStatus === "success" && (
                    <Button
                      disabled
                      className="bg-green-600"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Paiement confirmé - Impression en cours...
                    </Button>
                  )}
                  {(bambooPayStatus === "failed" || bambooPayStatus === "timeout") && (
                    <Button
                      onClick={resetBambooPayState}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Réessayer
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet de clôture de journée */}
      <Sheet open={showDayCloseSheet} onOpenChange={setShowDayCloseSheet}>
        <SheetContent side="right" className="w-[600px] sm:w-[700px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Clôture de journée - {new Date().toLocaleDateString('fr-FR')}
              {dayCloseSummary?.isAlreadyClosed && (
                <Badge variant="secondary" className="ml-2">
                  Déjà clôturée
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {dayCloseSummary?.isAlreadyClosed ? (
                <>
                  Journée clôturée le {new Date(dayCloseSummary.closedAt).toLocaleString('fr-FR')} par {dayCloseSummary.closedBy}
                </>
              ) : (
                "Résumé des ventes directes effectuées au magasin aujourd'hui"
              )}
            </SheetDescription>
          </SheetHeader>

          {dayCloseSummary && (
            <div className="mt-6 space-y-6">
              {/* En-tête de facture */}
              <div className="border-b pb-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">RAPPORT DE CAISSE</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {dayCloseSummary.storeName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date().toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Statistiques générales */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dayCloseSummary.totalSales}
                  </div>
                  <div className="text-sm text-blue-700">Ventes</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dayCloseSummary.totalItems}
                  </div>
                  <div className="text-sm text-green-700">Articles</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatFCFA(dayCloseSummary.totalRevenue)}
                  </div>
                  <div className="text-sm text-purple-700">Recette</div>
                </div>
              </div>

              {/* Liste des ventes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">
                  Détail des ventes
                </h3>

                {dayCloseSummary.sales && dayCloseSummary.sales.length > 0 ? (
                  <div className="space-y-2">
                    {dayCloseSummary.sales.map((sale: any, index: number) => (
                      <div key={sale.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {sale.customerName || 'Client anonyme'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(sale.createdAt).toLocaleTimeString('fr-FR')} •
                            {sale.itemCount} article{sale.itemCount > 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">
                            {formatFCFA(sale.total)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Espèces
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucune vente directe aujourd'hui</p>
                  </div>
                )}
              </div>

              {/* Totaux finaux */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total:</span>
                  <span>{formatFCFA(dayCloseSummary.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA:</span>
                  <span>{formatFCFA(dayCloseSummary.totalTax || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Remises accordées:</span>
                  <span>-{formatFCFA(dayCloseSummary.totalDiscounts || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL ENCAISSÉ:</span>
                  <span className="text-green-600">{formatFCFA(dayCloseSummary.totalRevenue)}</span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDayCloseSheet(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog d'impression de ticket */}
      {ticketData && (
        <ThermalPrinterDialog
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          ticketData={ticketData}
          onPrintSuccess={() => {
            console.log('Ticket imprimé avec succès')
          }}
        />
      )}

      {/* Sheet de configuration POS (Paramètres + Sous-caisses) */}
      <PosSettingsSheet
        open={showPrinterSettings}
        onOpenChange={setShowPrinterSettings}
        storeId={storeId}
      />
    </div>
  )
}
