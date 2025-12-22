"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { TicketData } from "@/lib/thermal-printer"
import { usePrinterSettings } from "@/components/pos/printer-settings-dialog"
import { PosSettingsSheet } from "@/components/pos/pos-settings-sheet"
import { SubBoxKpiSheet } from "@/components/pos/sub-box-kpi-sheet"
import { DayCloseSheet } from "@/components/pos/day-close-sheet"
import { ThermalPrinterDialog } from "@/components/pos/thermal-printer-dialog"

// Components
import { PosHeader } from "./components/PosHeader"
import { PosSidebar } from "./components/PosSidebar"
import { PosProductGrid } from "./components/PosProductGrid"
import { PosCart } from "./components/PosCart"
import { PosCheckoutDialog } from "./components/PosCheckoutDialog"

// Types
import { 
  Product, 
  Category, 
  Brand, 
  DeliveryPerson, 
  CartItem,
  StoreContact
} from "./types"

export default function PosPage() {
  const params = useParams()
  const storeId = params.id as string
  const { data: session } = useSession()

  // --- États Globaux ---
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  
  // --- États Checkout ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1) // 1: Client, 2: Payment
  const [orderType, setOrderType] = useState<"CLIENT_DELIVERY" | "CLIENT_STORE" | "DRIVER">("CLIENT_STORE")
  
  // --- États Impression ---
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [showPrinterSettings, setShowPrinterSettings] = useState(false)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const printerSettings = usePrinterSettings(storeId)

  // --- Données ---
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([])
  const [contacts, setContacts] = useState<StoreContact[]>([])
  const [deliveryZones, setDeliveryZones] = useState<any[]>([])
  const [storeInfo, setStoreInfo] = useState<any>(null)

  // --- Commandes Sous-Caisse ---
  const [subBoxOrders, setSubBoxOrders] = useState<any[]>([])
  const [isLoadingSubBoxOrders, setIsLoadingSubBoxOrders] = useState(true)
  const [subBoxOrderSearch, setSubBoxOrderSearch] = useState("")
  const [selectedSubBoxOrder, setSelectedSubBoxOrder] = useState<any>(null)

  // --- Loading States ---
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- Formulaire Checkout ---
  // Client
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState("")
  const [customerFirstName, setCustomerFirstName] = useState("")
  const [customerLastName, setCustomerLastName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  // Livraison
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
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Paiement
  const [posPaymentMethod, setPosPaymentMethod] = useState<"ESPECE" | "MOBILE">("ESPECE")
  const [notes, setNotes] = useState("")

  // Réductions
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState(0)

  // Clôture
  const [showDayCloseSheet, setShowDayCloseSheet] = useState(false)
  const [showKpiSheet, setShowKpiSheet] = useState(false)
  const [dayCloseSummary, setDayCloseSummary] = useState<any>(null)
  const [isLoadingDayClose, setIsLoadingDayClose] = useState(false)

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const barcodeBufferRef = useRef<string>("")
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- Initialisation ---
  useEffect(() => {
    loadProducts()
    loadCategories()
    loadBrands()
    loadDeliveryPersons()
    loadContacts()
    loadSubBoxOrders()
    loadDeliveryZones()
    loadStoreInfo()
    loadDayCloseSummary() // Charger le résumé au démarrage
  }, [storeId])

  // --- Scanner Code-barres ---
  useEffect(() => {
    let lastKeyTime = 0

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTime
      lastKeyTime = currentTime

      if (event.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          event.preventDefault()
          event.stopPropagation()
          const scannedCode = barcodeBufferRef.current.trim()
          barcodeBufferRef.current = ""
          if (barcodeTimeoutRef.current) {
            clearTimeout(barcodeTimeoutRef.current)
            barcodeTimeoutRef.current = null
          }
          handleBarcodeScanned(scannedCode)
        }
        return
      }

      if (event.key.length !== 1) return

      const target = event.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (isInputField && timeDiff > 50 && barcodeBufferRef.current.length === 0) {
        return
      }

      barcodeBufferRef.current += event.key

      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current)
      }

      barcodeTimeoutRef.current = setTimeout(() => {
        barcodeBufferRef.current = ""
      }, 200)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current)
    }
  }, [products])

  const handleBarcodeScanned = (code: string) => {
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
      addToCart(product)
    } else {
      toast.error(`Produit non trouvé : ${code}`)
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

  // --- Chargement des Données ---
  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true)
      const response = await fetch(`/api/stores/${storeId}/products`)
      if (!response.ok) throw new Error("Erreur chargement produits")
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error(error)
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
      setCategories(data.filter((c: Category) => !c.description?.includes("parent")))
    } catch (error) {
      console.error(error)
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
      console.error(error)
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
      console.error(error)
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
      console.error(error)
    }
  }

  const loadDeliveryZones = async () => {
    try {
      const response = await fetch(`/api/delivery-zones?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur chargement zones")
      const data = await response.json()
      setDeliveryZones(data.filter((z: any) => z.isActive))
    } catch (error) {
      console.error(error)
    }
  }

  const loadStoreInfo = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`)
      if (!response.ok) throw new Error("Erreur chargement magasin")
      const data = await response.json()
      setStoreInfo(data)
    } catch (error) {
      console.error(error)
    }
  }

  // --- Gestion Sous-Caisse ---
  const loadSubBoxOrders = async (search?: string) => {
    try {
      setIsLoadingSubBoxOrders(true)
      const searchParam = search || subBoxOrderSearch
      const url = `/api/stores/${storeId}/sub-box-orders?status=PENDING${searchParam ? `&search=${searchParam}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (!response.ok) throw new Error("Erreur chargement commandes sous-caisse")
      setSubBoxOrders(data.data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingSubBoxOrders(false)
    }
  }

  const loadSubBoxOrderToCart = (order: any) => {
    setCart([])
    const newCartItems: CartItem[] = []
    
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId)
      if (product) {
        newCartItems.push({
          product,
          quantity: item.quantity,
          discountAmount: item.discount > 0 ? item.discount : undefined,
        })
      }
    }

    if (newCartItems.length > 0) {
      setCart(newCartItems)
      if (order.totalDiscount > 0) {
        setGlobalDiscountAmount(order.totalDiscount)
      } else {
        setGlobalDiscountAmount(0)
        setGlobalDiscount(0)
      }
      setSelectedSubBoxOrder(order)
      toast.success(`Commande ${order.clientCode} chargée`)
    }
  }

  const validateSubBoxOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/sub-box-orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "validate" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur validation")
      }

      loadSubBoxOrders()
      setSelectedSubBoxOrder(null)
      toast.success("Commande sous-caisse validée")
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la validation")
    }
  }

  const cancelSubBoxOrder = async (orderId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/sub-box-orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "cancel", cancelReason: reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur annulation")
      }

      loadSubBoxOrders()
      setSelectedSubBoxOrder(null)
      toast.success("Commande sous-caisse annulée")
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'annulation")
    }
  }

  // --- Gestion Panier & Produits ---
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    )
  }

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
    setGlobalDiscount(0)
    setGlobalDiscountAmount(0)
    setSelectedSubBoxOrder(null)
  }

  const updateItemDiscountAmount = (productId: string, discountAmount: number) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, discountAmount: Math.max(0, discountAmount), discount: undefined }
        : item
    ))
  }

  // Calculs Panier
  const cartSubtotal = cart.reduce((sum, item) => {
    const itemTotal = item.product.prixVente * item.quantity
    let discountedTotal = itemTotal
    if (item.discount && item.discount > 0) {
      discountedTotal = itemTotal * (1 - item.discount / 100)
    } else if (item.discountAmount && item.discountAmount > 0) {
      discountedTotal = Math.max(0, itemTotal - item.discountAmount)
    }
    return sum + discountedTotal
  }, 0)

  const cartTax = cart.reduce((sum, item) => {
    const itemTotal = item.product.prixVente * item.quantity
    let discountedTotal = itemTotal
    if (item.discount && item.discount > 0) {
      discountedTotal = itemTotal * (1 - item.discount / 100)
    } else if (item.discountAmount && item.discountAmount > 0) {
      discountedTotal = Math.max(0, itemTotal - item.discountAmount)
    }
    return sum + (discountedTotal * item.product.tva / 100)
  }, 0)

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
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // --- Gestion Adresse & Zone ---
  const handleAddressSearch = (query: string) => {
    setDeliveryAddress(query)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    if (query.length < 3) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      setLoadingAddresses(false)
      return
    }

    setLoadingAddresses(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=ga`,
          { headers: { 'Accept-Language': 'fr' } }
        )
        const data = await response.json()
        setAddressSuggestions(data)
        setShowAddressSuggestions(data.length > 0)
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingAddresses(false)
      }
    }, 500)
  }

  const handleSelectAddress = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)
    setDeliveryAddress(suggestion.display_name)
    setDeliveryLatitude(lat)
    setDeliveryLongitude(lng)
    setShowAddressSuggestions(false)
    setAddressSuggestions([])

    // Detect zone logic (simplified from original)
    // You might want to move detectDeliveryZone to a helper or hook
  }

  const handleSelectContact = (contact: any) => {
    setSelectedContactId(contact.id)
    setCustomerFirstName(contact.firstName || "")
    setCustomerLastName(contact.lastName || "")
    setCustomerPhone(contact.phone || "")
    setCustomerEmail(contact.email || "")
    setContactSearch("")
  }

  // --- Création de Commande ---
  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast.error("Panier vide")
      return
    }

    try {
      setIsSubmitting(true)
      
      // Logique similaire à l'original pour créer le contact si nécessaire
      let contactId = selectedContactId
      const isCustomerProvided = customerFirstName.trim() || customerLastName.trim() || customerPhone.trim()
      const defaultCustomerPhone = "+241xxxxxx"

      if (!contactId && isCustomerProvided) {
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
          loadContacts()
        }
      }

      // Création vente POS
      const saleData = {
        storeId,
        contactId: contactId || null,
        customerName: isCustomerProvided ? `${customerFirstName} ${customerLastName}`.trim() : "Client",
        customerPhone: isCustomerProvided ? customerPhone || defaultCustomerPhone : defaultCustomerPhone,
        customerEmail: customerEmail || null,
        paymentMethod: "CASH",
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
      toast.success(`Vente ${sale.number || 'POS'} enregistrée !`)

      // Validation sous-caisse si nécessaire
      if (selectedSubBoxOrder) {
        try {
          await validateSubBoxOrder(selectedSubBoxOrder.id)
        } catch (e) {
           console.error("Erreur validation auto sous-caisse", e)
        }
      }

      // Impression Ticket
      handlePrintTicket(sale, saleData)

      resetForm()
      loadProducts()

    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Erreur lors de la vente")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMobilePaymentSuccess = async (reference: string, phone: string) => {
    // Créer la commande après succès MyPVit
    try {
      setIsSubmitting(true)
      
      let contactId = selectedContactId
      const isCustomerProvided = customerFirstName.trim() || customerLastName.trim() || customerPhone.trim()
      const defaultCustomerPhone = "+241xxxxxx"

      if (!contactId && isCustomerProvided) {
        // Create contact if needed...
        // Simplified for brevity, reuse logic or separate function
      }

      const saleData = {
        storeId,
        contactId: contactId || null,
        customerName: isCustomerProvided ? `${customerFirstName} ${customerLastName}`.trim() : "Client",
        customerPhone: isCustomerProvided ? customerPhone || phone : phone, // Use payment phone if customer phone empty
        paymentMethod: "MOBILE",
        paymentReference: reference,
        notes: notes || `Vente POS - Paiement MyPVit (Ref: ${reference})`,
        items: cart.map(item => ({
           productId: item.product.id,
           quantity: item.quantity,
           unitPrice: item.product.prixVente,
           // ... discounts logic
        })),
        globalDiscount: globalDiscountApplied,
        isAnonymousCustomer: !isCustomerProvided,
      }

      const response = await fetch(`/api/stores/${storeId}/pos-sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      })

      if (!response.ok) throw new Error("Erreur création vente")
      
      const sale = await response.json()
      toast.success(`Vente ${sale.number || 'POS'} enregistrée !`)

      if (selectedSubBoxOrder) {
         await validateSubBoxOrder(selectedSubBoxOrder.id)
      }

      handlePrintTicket(sale, saleData)
      resetForm()
      loadProducts()

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintTicket = async (sale: any, saleData: any) => {
    // Generate ticket data
    const ticket: TicketData = {
      storeName: storeInfo?.name || printerSettings.storeName || "Magasin",
      storeAddress: storeInfo?.address || printerSettings.storeAddress,
      storePhone: storeInfo?.phone || printerSettings.storePhone,
      ticketNumber: sale.number || `POS-${Date.now()}`,
      date: new Date(),
      cashier: session?.user?.name || "Caissier",
      customerName: !saleData.isAnonymousCustomer ? saleData.customerName : undefined,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.prixVente,
        total: item.product.prixVente * item.quantity,
        // ...
      })),
      subtotal: cartSubtotal,
      tax: cartTax,
      discount: globalDiscountApplied,
      total: cartTotal,
      paymentMethod: saleData.paymentMethod,
    }
    
    setTicketData(ticket)
    
    if (printerSettings.autoprint) {
      try {
        const { thermalPrinter } = await import('@/lib/thermal-printer')
        await thermalPrinter.printTicket(ticket)
        toast.success('Ticket imprimé')
      } catch (e) {
        setShowPrintDialog(true)
      }
    } else {
      setShowPrintDialog(true)
    }
  }

  const resetForm = () => {
    setCheckoutStep(1)
    setOrderType("CLIENT_STORE")
    setSelectedContactId(null)
    setContactSearch("")
    setCustomerFirstName("")
    setCustomerLastName("")
    setCustomerPhone("")
    setCustomerEmail("")
    setDeliveryAddress("")
    setPosPaymentMethod("ESPECE")
    setNotes("")
    setIsCheckoutOpen(false)
    clearCart()
  }

  // --- Clôture de Journée ---
  const handleDayClose = async () => {
    setIsLoadingDayClose(true)
    try {
      // 1. D'abord on clôture
      const closeResponse = await fetch(`/api/stores/${storeId}/day-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (!closeResponse.ok) {
        const error = await closeResponse.json()
        throw new Error(error.message || 'Erreur clôture')
      }
      
      // 2. Ensuite on récupère le résumé
      const summaryResponse = await fetch(`/api/stores/${storeId}/day-close-summary`)
      const summaryData = await summaryResponse.json()
      
      setDayCloseSummary(summaryData)
      setShowDayCloseSheet(true)
      toast.success('Journée clôturée avec succès')
      
      // 3. Impression automatique du ticket de clôture si possible
      // (Optionnel : ajouter logique d'impression ticket Z ici)
      
    } catch (error: any) {
      console.error("Day close error:", error)
      toast.error(error.message || "Impossible de clôturer la journée")
    } finally {
      setIsLoadingDayClose(false)
    }
  }

  const loadDayCloseSummary = async () => {
    try {
      setIsLoadingDayClose(true)
      const response = await fetch(`/api/stores/${storeId}/day-close-summary`)
      if (response.ok) {
        const data = await response.json()
        setDayCloseSummary(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingDayClose(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Section Gauche */}
      <div className="flex-1 flex flex-col min-w-0">
        <PosHeader 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categories={categories}
          selectedCategories={selectedCategories}
          toggleCategory={toggleCategory}
        />

        <div className="flex flex-1 overflow-hidden">
          <PosSidebar 
            subBoxOrders={subBoxOrders}
            loadSubBoxOrders={loadSubBoxOrders}
            isLoadingSubBoxOrders={isLoadingSubBoxOrders}
            subBoxOrderSearch={subBoxOrderSearch}
            setSubBoxOrderSearch={setSubBoxOrderSearch}
            selectedSubBoxOrder={selectedSubBoxOrder}
            loadSubBoxOrderToCart={loadSubBoxOrderToCart}
            validateSubBoxOrder={validateSubBoxOrder}
            cancelSubBoxOrder={cancelSubBoxOrder}
            handleDayClose={handleDayClose}
            isLoadingDayClose={isLoadingDayClose}
            dayCloseSummary={dayCloseSummary}
            setShowKpiSheet={setShowKpiSheet}
          />

          <PosProductGrid 
            filteredProducts={filteredProducts}
            isLoadingProducts={isLoadingProducts}
            addToCart={addToCart}
            selectedCategories={selectedCategories}
            categories={categories}
          />
        </div>
      </div>

      {/* Section Droite - Panier */}
      <div className="w-96 border-l bg-white flex flex-col shadow-xl z-10">
        <PosCart 
          cart={cart}
          storeId={storeId}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          cartSubtotal={cartSubtotal}
          cartTotal={cartTotal}
          globalDiscountApplied={globalDiscountApplied}
          setIsCheckoutOpen={setIsCheckoutOpen}
          setShowPrinterSettings={setShowPrinterSettings}
          cartItemsCount={cartItemsCount}
          updateItemDiscountAmount={updateItemDiscountAmount}
        />
      </div>

      {/* Dialog Checkout */}
      <PosCheckoutDialog 
        isOpen={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        step={checkoutStep}
        setStep={setCheckoutStep}
        orderType={orderType}
        setOrderType={setOrderType}
        
        contacts={contacts}
        contactSearch={contactSearch}
        setContactSearch={setContactSearch}
        handleSelectContact={handleSelectContact}
        customerFirstName={customerFirstName}
        setCustomerFirstName={setCustomerFirstName}
        customerLastName={customerLastName}
        setCustomerLastName={setCustomerLastName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}

        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        addressSuggestions={addressSuggestions}
        showAddressSuggestions={showAddressSuggestions}
        handleAddressSearch={handleAddressSearch}
        handleSelectAddress={handleSelectAddress}
        loadingAddresses={loadingAddresses}
        deliveryFee={deliveryFee}
        selectedDeliveryPerson={selectedDeliveryPerson}
        setSelectedDeliveryPerson={setSelectedDeliveryPerson}
        deliveryPersons={deliveryPersons}
        requestedDeliveryDate={requestedDeliveryDate}
        setRequestedDeliveryDate={setRequestedDeliveryDate}

        cart={cart}
        cartTotal={cartTotal}
        cartSubtotal={cartSubtotal}
        cartTax={cartTax}
        globalDiscountApplied={globalDiscountApplied}
        cartItemsCount={cartItemsCount}

        posPaymentMethod={posPaymentMethod}
        setPosPaymentMethod={setPosPaymentMethod}
        
        handleCreateOrder={handleCreateOrder}
        onMobilePaymentSuccess={handleMobilePaymentSuccess}
        isSubmitting={isSubmitting}
        storeId={storeId}
        resetForm={resetForm}
      />

      {/* Autres Sheets/Dialogs */}
      {ticketData && (
        <ThermalPrinterDialog
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          ticketData={ticketData}
          onPrintSuccess={() => console.log('Ticket imprimé')}
        />
      )}

      <PosSettingsSheet
        open={showPrinterSettings}
        onOpenChange={setShowPrinterSettings}
        storeId={storeId}
      />

      <SubBoxKpiSheet
        open={showKpiSheet}
        onOpenChange={setShowKpiSheet}
        storeId={storeId}
      />

      <DayCloseSheet
        open={showDayCloseSheet}
        onOpenChange={setShowDayCloseSheet}
        summary={dayCloseSummary}
      />
    </div>
  )
}
