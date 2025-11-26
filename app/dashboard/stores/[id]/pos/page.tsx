"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
  // États
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(0)
  const [orderType, setOrderType] = useState<"CLIENT_DELIVERY" | "CLIENT_STORE" | "DRIVER" | null>(null)
  
  // Données
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  
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

  // Refs
  const addressDropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Charger les données au montage
  useEffect(() => {
    loadProducts()
    loadCategories()
    loadBrands()
    loadDeliveryPersons()
    loadContacts()
    loadDeliveryZones()
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

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true)
      const response = await fetch(`/api/stores/${storeId}/products`)
      if (!response.ok) throw new Error("Erreur chargement produits")
      const data = await response.json()
      setProducts(data)
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error("Error loading contacts:", error)
    }
  }

  const loadDeliveryZones = async () => {
    try {
      const response = await fetch(`/api/delivery-zones?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur chargement zones")
      const data = await response.json()
      setDeliveryZones(data.filter((z: any) => z.isActive))
    } catch (error) {
      console.error("Error loading delivery zones:", error)
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
      } catch (error) {
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
    if (orderType === "CLIENT_DELIVERY" || orderType === "CLIENT_STORE") {
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
      // Pour CLIENT_DELIVERY, on met un livreur fictif pour éviter le déstockage du magasin
      deliveryPersonId: selectedDeliveryPerson && selectedDeliveryPerson !== "none" ? selectedDeliveryPerson : "PENDING_ASSIGNMENT",
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

    // Créer directement une vente POS (pas de commande, juste des mouvements de stock)
    const saleData = {
      storeId,
      contactId: contactId || null,
      customerName: `${customerFirstName} ${customerLastName}`.trim() || "Client",
      customerPhone,
      customerEmail: customerEmail || null,
      paymentMethod: "CASH", // Toujours en espèces pour les ventes au magasin
      notes: notes || "Vente directe POS",
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.prixVente,
      })),
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
    
    // Réinitialiser
    resetCheckoutForm()
    clearCart()
    setIsCheckoutOpen(false)
    
    // Recharger les produits pour mettre à jour les stocks
    loadProducts()
  }

  const resetCheckoutForm = () => {
    setCheckoutStep(0)
    setOrderType(null)
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
  }

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

  // Fonction pour charger le résumé de clôture de journée
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
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du résumé de la journée')
    } finally {
      setIsLoadingDayClose(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Section Gauche - Produits */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4.5">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un produit..."
                className="pl-10 border-gray-200 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Multi-select Catégories */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">Catégories:</span>
              <div className="flex gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
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

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Marques */}
          <div className="w-40 bg-white border-r p-3 overflow-y-auto">
            {isLoadingBrands ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Bouton Toutes */}
                <button
                  onClick={() => setSelectedBrand("all")}
                  className={cn(
                    "w-full flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
                    selectedBrand === "all"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "hover:bg-gray-50 text-gray-600"
                  )}
                >
                  <Package className="h-6 w-6" />
                  <span className="font-medium text-xs text-center">Toutes</span>
                </button>
                
                {/* Liste des marques */}
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand.id)}
                    className={cn(
                      "w-full flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
                      selectedBrand === brand.id
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="h-8 w-8 object-contain" />
                    ) : (
                      <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-xs text-center line-clamp-2">{brand.name}</span>
                    <span className="text-[10px] text-gray-400">{brand._count.products}</span>
                  </button>
                ))}
              </div>
            )}
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
                <Badge variant="outline">{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</Badge>
              </div>
              
              {/* Bouton Clôture de journée */}
              <Button
                variant="outline"
                size="sm"
                onClick={loadDayCloseSummary}
                disabled={isLoadingDayClose}
                className={cn(
                  "w-full text-xs h-7",
                  dayCloseSummary?.isAlreadyClosed && "border-green-200 bg-green-50 text-green-700"
                )}
              >
                {isLoadingDayClose ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Chargement...
                  </>
                ) : dayCloseSummary?.isAlreadyClosed ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Journée clôturée
                  </>
                ) : (
                  <>
                    <Calendar className="h-3 w-3 mr-1" />
                    Clôturer la journée
                  </>
                )}
              </Button>
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
                        
                        {/* Réductions par article */}
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="number"
                            placeholder="% remise"
                            value={item.discount || ''}
                            onChange={(e) => updateItemDiscount(item.product.id, Number(e.target.value))}
                            className="h-7 text-xs w-36"
                            min="0"
                            max="100"
                          />
                          <Input
                            type="number"
                            placeholder="FCFA"
                            value={item.discountAmount || ''}
                            onChange={(e) => updateItemDiscountAmount(item.product.id, Number(e.target.value))}
                            className="h-7 text-xs w-36"
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
                {/* Remise globale */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Remise globale</div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="% remise"
                      value={globalDiscount || ''}
                      onChange={(e) => {
                        setGlobalDiscount(Number(e.target.value))
                        setGlobalDiscountAmount(0) // Reset l'autre type de remise
                      }}
                      className="h-8 text-sm flex-1"
                      min="0"
                      max="100"
                    />
                    <Input
                      type="number"
                      placeholder="Montant FCFA"
                      value={globalDiscountAmount || ''}
                      onChange={(e) => {
                        setGlobalDiscountAmount(Number(e.target.value))
                        setGlobalDiscount(0) // Reset l'autre type de remise
                      }}
                      className="h-8 text-sm flex-1"
                      min="0"
                    />
                  </div>
                </div>

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
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">TVA</span>
                    <span className="font-medium">{cartTax.toLocaleString()} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frais livraison</span>
                    <span className="font-medium">{deliveryFee.toLocaleString()} F</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span>Total</span>
                    <span className="text-blue-600">{cartTotal.toLocaleString()} F</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Valider la commande
                </Button>
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
            <DialogTitle className="text-xl">Finaliser la commande</DialogTitle>
            <DialogDescription>
              {checkoutStep === 0 && "Sélectionnez le type de transaction"}
              {checkoutStep === 1 && (orderType === "CLIENT_DELIVERY" || orderType === "CLIENT_STORE" ? "Sélectionnez ou créez un client" : "Sélectionnez le livreur")}
              {checkoutStep === 2 && "Configurez la livraison"}
              {checkoutStep === 3 && "Confirmez le paiement"}
            </DialogDescription>
            
            {/* Indicateur d'étapes - seulement pour CLIENT_DELIVERY */}
            {orderType === "CLIENT_DELIVERY" && checkoutStep > 0 && (
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                      checkoutStep === step ? "bg-blue-600 text-white" :
                      checkoutStep > step ? "bg-green-500 text-white" :
                      "bg-gray-200 text-gray-500"
                    )}>
                      {checkoutStep > step ? "✓" : step}
                    </div>
                    {step < 3 && (
                      <div className={cn(
                        "flex-1 h-1 mx-2 rounded",
                        checkoutStep > step ? "bg-green-500" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogHeader>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* ÉTAPE 0: Sélection du type de transaction */}
            {checkoutStep === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Type de transaction</h3>
                  <p className="text-sm text-gray-600">
                    Choisissez le type de commande selon la situation
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Option Client à livrer */}
                  <button
                    onClick={() => {
                      setOrderType("CLIENT_DELIVERY")
                      setCheckoutStep(1)
                    }}
                    className="group relative p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:from-blue-500 group-hover:to-blue-600 transition-all">
                        <Truck className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-base font-semibold mb-1 group-hover:text-blue-600 transition-colors">
                          Client à livrer
                        </h4>
                        <p className="text-xs text-gray-500 leading-tight">
                          Commande avec livraison
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option Client au magasin */}
                  <button
                    onClick={() => {
                      setOrderType("CLIENT_STORE")
                      setCheckoutStep(1)
                    }}
                    className="group relative p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center group-hover:from-purple-500 group-hover:to-purple-600 transition-all">
                        <User className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-base font-semibold mb-1 group-hover:text-purple-600 transition-colors">
                          Client au magasin
                        </h4>
                        <p className="text-xs text-gray-500 leading-tight">
                          Vente directe POS
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option Livreur */}
                  <button
                    onClick={() => {
                      setOrderType("DRIVER")
                      setCheckoutStep(1)
                    }}
                    className="group relative p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center group-hover:from-green-500 group-hover:to-green-600 transition-all">
                        <Package className="h-8 w-8 text-green-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-base font-semibold mb-1 group-hover:text-green-600 transition-colors">
                          Transfert Livreur
                        </h4>
                        <p className="text-xs text-gray-500 leading-tight">
                          Approvisionnement
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Information</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>• <strong>Client à livrer :</strong> Commande avec livraison (ne déstocke pas le magasin)</li>
                        <li>• <strong>Client au magasin :</strong> Vente directe POS (déstocke le magasin)</li>
                        <li>• <strong>Transfert Livreur :</strong> Demande d'approvisionnement pour le livreur</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 1: Client ou Livreur selon le type */}
            {checkoutStep === 1 && (orderType === "CLIENT_DELIVERY" || orderType === "CLIENT_STORE") && (
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

            {/* ÉTAPE 1: Sélection du livreur (Mode DRIVER) */}
            {checkoutStep === 1 && orderType === "DRIVER" && (
              <div className="space-y-4">
                

                <div className="space-y-3">
                  <Label htmlFor="driverSelect" className="text-base font-semibold">
                    Sélectionner le livreur *
                  </Label>
                  
                  {isLoadingDrivers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : deliveryPersons.filter(d => d.status === "AVAILABLE" || d.status === "BUSY").length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-lg">
                      <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">Aucun livreur disponible</p>
                      <p className="text-xs text-gray-400 mt-2">Les livreurs doivent être disponibles ou occupés</p>
                    </div>
                  ) : (
                    <Select value={selectedDeliveryPerson} onValueChange={setSelectedDeliveryPerson}>
                      <SelectTrigger className="w-full h-14 text-base py-8">
                        <SelectValue placeholder="Choisir un livreur..." />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryPersons
                          .filter(d => d.status === "AVAILABLE" || d.status === "BUSY")
                          .map((driver) => (
                            <SelectItem key={driver.id} value={driver.id} className="py-2">
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center font-semibold text-green-700">
                                  {driver.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{driver.name}</span>
                                    <Badge 
                                      variant={driver.status === "AVAILABLE" ? "default" : "secondary"}
                                      className={cn(
                                        "text-xs",
                                        driver.status === "AVAILABLE" 
                                          ? "bg-green-100 text-green-700 border-green-200" 
                                          : "bg-amber-100 text-amber-700 border-amber-200"
                                      )}
                                    >
                                      {driver.status === "AVAILABLE" ? "Disponible" : "Occupé"}
                                    </Badge>
                                  </div>
                                  <span className="text-sm text-gray-600">{driver.phone}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

              
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label htmlFor="driverNotes">Notes (optionnel)</Label>
                  <Textarea
                    id="driverNotes"
                    placeholder="Ex: Stock pour la tournée du matin..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Récapitulatif du transfert */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Récapitulatif du transfert</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nombre d'articles:</span>
                      <span className="font-medium">{cartItemsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valeur totale:</span>
                      <span className="font-medium">{cartSubtotal.toLocaleString()} FCFA</span>
                    </div>
                    {selectedDeliveryPerson && (
                      <div className="flex justify-between text-green-700">
                        <span>Livreur:</span>
                        <span className="font-medium">
                          {deliveryPersons.find(d => d.id === selectedDeliveryPerson)?.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium mb-1">Mouvements automatiques :</p>
                        <ul className="space-y-0.5">
                          <li>• <strong>Magasin :</strong> Sortie de stock enregistrée</li>
                          <li>• <strong>Livreur :</strong> Entrée de stock enregistrée</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 2: Livraison (seulement pour CLIENT_DELIVERY) */}
            {checkoutStep === 2 && orderType === "CLIENT_DELIVERY" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Adresse de livraison *
                  </h3>
                  <p className="text-sm text-gray-600">
                    Vous pouvez entrer une adresse manuellement ou sélectionner une suggestion avec géolocalisation
                  </p>
                  <div className="relative" ref={addressDropdownRef}>
                    <div className="relative">
                      <Input
                        placeholder="Tapez une adresse (ex: Boulevard Triomphal, Libreville)..."
                        value={deliveryAddress}
                        onChange={(e) => handleAddressSearch(e.target.value)}
                        onFocus={() => {
                          if (addressSuggestions.length > 0) {
                            setShowAddressSuggestions(true)
                          }
                        }}
                        className="flex-1 pr-10"
                      />
                      {loadingAddresses && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* Dropdown d'autocomplete */}
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {addressSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectAddress(suggestion)}
                            className="w-full p-3 text-left hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <Package className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900">
                                  {suggestion.display_name}
                                </div>
                                {suggestion.address && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {[
                                      suggestion.address.road,
                                      suggestion.address.suburb || suggestion.address.neighbourhood,
                                      suggestion.address.city || suggestion.address.town,
                                    ].filter(Boolean).join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {deliveryLatitude && deliveryLongitude && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Localisation confirmée
                      </div>
                      <div className="text-green-600 text-xs">
                        Lat: {deliveryLatitude.toFixed(6)}, Lng: {deliveryLongitude.toFixed(6)}
                      </div>
                    </div>
                  )}

                  {detectedZone && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                        <Info className="h-4 w-4" />
                        Zone de livraison détectée
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Zone:</span>
                          <span className="font-medium">{detectedZone.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frais de livraison:</span>
                          <span className="font-medium">{detectedZone.deliveryFee} FCFA</span>
                        </div>
                        {detectedZone.estimatedTime && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Temps estimé:</span>
                            <span className="font-medium">{detectedZone.estimatedTime} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {deliveryLatitude && deliveryLongitude && !detectedZone && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Cette adresse n'est dans aucune zone de livraison configurée</span>
                      </div>
                    </div>
                  )}

                  {deliveryAddress && !deliveryLatitude && !deliveryLongitude && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                      <div className="flex items-start gap-2 text-blue-700">
                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium mb-1">Adresse manuelle</p>
                          <p className="text-xs">
                            Vous avez saisi une adresse manuellement. La détection automatique de zone et les frais de livraison ne seront pas calculés automatiquement.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Date de livraison souhaitée */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de livraison souhaitée
                  </h3>
                  <p className="text-sm text-gray-600">
                    Sélectionnez la date à laquelle le client souhaite recevoir sa commande
                  </p>
                  <Input
                    type="date"
                    value={requestedDeliveryDate}
                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} // Minimum aujourd'hui
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Par défaut: {new Date(requestedDeliveryDate).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold">Configuration de la livraison (optionnel)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="deliveryPerson">Livreur (optionnel)</Label>
                      <Select value={selectedDeliveryPerson} onValueChange={setSelectedDeliveryPerson}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun livreur</SelectItem>
                          {deliveryPersons
                            .filter(d => d.status === "AVAILABLE")
                            .map((person) => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="deliveryFee">Frais (FCFA)</Label>
                      <Input
                        id="deliveryFee"
                        type="number"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 2: Paiement direct (CLIENT_STORE uniquement) */}
            {checkoutStep === 2 && orderType === "CLIENT_STORE" && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Banknote className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">Paiement en espèces</h3>
                      <p className="text-sm text-green-700">Vente directe au magasin - Paiement en espèces uniquement</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ajoutez des notes sur cette vente..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Récapitulatif vente directe */}
                <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-purple-900">Récapitulatif de la vente</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">
                        {customerFirstName} {customerLastName} • {customerPhone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-purple-700">Vente directe POS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paiement:</span>
                      <span className="font-medium text-green-700">Espèces</span>
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

            {/* ÉTAPE 3: Paiement et confirmation (CLIENT_DELIVERY uniquement) */}
            {checkoutStep === 3 && orderType === "CLIENT_DELIVERY" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Mode de paiement
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                          paymentMethod === method.id
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <method.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ajoutez des instructions spéciales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Récapitulatif final */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Récapitulatif de la commande</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">
                        {customerFirstName} {customerLastName} • {customerPhone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Livraison:</span>
                      <span className="font-medium text-right max-w-xs truncate">
                        {deliveryAddress || "Non spécifiée"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date souhaitée:</span>
                      <span className="font-medium">
                        {new Date(requestedDeliveryDate).toLocaleDateString('fr-FR', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                    {detectedZone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Zone:</span>
                        <span className="font-medium">{detectedZone.name}</span>
                      </div>
                    )}
                    {selectedDeliveryPerson && selectedDeliveryPerson !== "none" && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Livreur:</span>
                        <span className="font-medium">
                          {deliveryPersons.find(d => d.id === selectedDeliveryPerson)?.name || "Non spécifié"}
                        </span>
                      </div>
                    )}
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
                    <div className="flex justify-between text-gray-600">
                      <span>Livraison</span>
                      <span>{deliveryFee.toLocaleString()} FCFA</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold pt-2">
                      <span>Total à payer</span>
                      <span className="text-blue-600">{cartTotal.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer fixe avec boutons de navigation */}
          <div className="shrink-0 border-t bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              {/* Bouton Précédent ou Annuler */}
              {checkoutStep > 0 && ((orderType === "CLIENT_DELIVERY" && checkoutStep > 1) || (orderType === "CLIENT_STORE" && checkoutStep > 1) || (orderType === "DRIVER" && checkoutStep > 1)) ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (checkoutStep === 1 && orderType) {
                      // Retour à la sélection du type
                      setCheckoutStep(0)
                      setOrderType(null)
                    } else {
                      setCheckoutStep(checkoutStep - 1)
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Précédent
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (checkoutStep === 0 || (checkoutStep === 1 && orderType)) {
                      // Permettre de revenir à l'étape 0 si on est à l'étape 1
                      if (checkoutStep === 1 && orderType) {
                        setCheckoutStep(0)
                        setOrderType(null)
                      } else {
                        setIsCheckoutOpen(false)
                        resetCheckoutForm()
                      }
                    } else {
                      setIsCheckoutOpen(false)
                      resetCheckoutForm()
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {checkoutStep === 1 && orderType ? "Retour" : "Annuler"}
                </Button>
              )}

              {/* Bouton Suivant ou Valider */}
              {checkoutStep === 0 ? (
                // Pas de bouton suivant à l'étape 0, la sélection se fait via les cards
                <div></div>
              ) : orderType === "DRIVER" && checkoutStep === 1 ? (
                // Pour DRIVER, bouton de validation direct à l'étape 1
                <Button
                  onClick={handleCreateOrder}
                  disabled={isSubmitting || !canSubmitDriverOrder()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transfert en cours...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 mr-2" />
                      Transférer au livreur
                    </>
                  )}
                </Button>
              ) : orderType === "CLIENT_STORE" && checkoutStep === 2 ? (
                // Pour CLIENT_STORE, bouton de validation à l'étape 2
                <Button
                  onClick={handleCreateOrder}
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Vente en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Finaliser la vente
                    </>
                  )}
                </Button>
              ) : orderType === "CLIENT_DELIVERY" && checkoutStep < 3 ? (
                // Pour CLIENT_DELIVERY, bouton suivant jusqu'à l'étape 3
                <Button
                  onClick={() => setCheckoutStep(checkoutStep + 1)}
                  disabled={
                    (checkoutStep === 1 && !canProceedToStep2()) ||
                    (checkoutStep === 2 && !canProceedToStep3())
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Suivant
                </Button>
              ) : orderType === "CLIENT_DELIVERY" && checkoutStep === 3 ? (
                // Pour CLIENT_DELIVERY, bouton de validation finale à l'étape 3
                <Button
                  onClick={handleCreateOrder}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Créer la commande
                    </>
                  )}
                </Button>
              ) : orderType === "CLIENT_STORE" && checkoutStep === 1 ? (
                // Pour CLIENT_STORE, bouton suivant à l'étape 1
                <Button
                  onClick={() => setCheckoutStep(2)}
                  disabled={!customerPhone.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Suivant
                </Button>
              ) : null}
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
                  className="flex-1"
                  onClick={() => window.print()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowDayCloseSheet(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
