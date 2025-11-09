"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Save, Building2 } from "lucide-react"
import { toast } from "sonner"

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  job?: string
}

interface Product {
  id: string
  name: string
  price: number
  sku: string
}

interface QuoteItem {
  id: string
  productId: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface CreateQuoteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateQuoteSheet({ open, onOpenChange, onSuccess }: CreateQuoteSheetProps) {
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  const [quoteNumber, setQuoteNumber] = useState("")
  const [selectedContactId, setSelectedContactId] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuoteItem[]>([])

  const selectedContact = contacts.find(c => c.id === selectedContactId)

  useEffect(() => {
    if (open) {
      generateQuoteNumber()
      fetchContacts()
      fetchProducts()
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 30)
      setValidUntil(defaultDate.toISOString().split('T')[0])
      setItems([])
    }
  }, [open])

  const generateQuoteNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
    setQuoteNumber(`DEV-${year}${month}${day}-${time}`)
  }

  const fetchContacts = async () => {
    setLoadingContacts(true)
    try {
      console.log("🔄 Récupération des contacts...")
      const response = await fetch("/api/contacts")
      console.log("📡 Réponse contacts:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Contacts récupérés:", data.length, "contacts")
        setContacts(data)
      } else {
        console.error("❌ Erreur HTTP contacts:", response.status, response.statusText)
        toast.error("Impossible de charger les contacts")
      }
    } catch (error) {
      console.error("❌ Erreur réseau contacts:", error)
      toast.error("Erreur lors du chargement des contacts")
    } finally {
      setLoadingContacts(false)
    }
  }

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      console.log("🔄 Récupération des produits...")
      const response = await fetch("/api/products")
      console.log("📡 Réponse produits:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Produits récupérés:", data.length, "produits")
        setProducts(data)
      } else {
        console.error("❌ Erreur HTTP produits:", response.status, response.statusText)
        toast.error("Impossible de charger les produits")
      }
    } catch (error) {
      console.error("❌ Erreur réseau produits:", error)
      toast.error("Erreur lors du chargement des produits")
    } finally {
      setLoadingProducts(false)
    }
  }

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      productId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0
    }
    setItems([...items, newItem])
  }

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value)
          if (product) {
            updatedItem.unitPrice = product.price
            updatedItem.description = product.name
          }
        }
        
        const subtotal = updatedItem.quantity * updatedItem.unitPrice
        const discountAmount = (subtotal * updatedItem.discount) / 100
        updatedItem.total = subtotal - discountAmount
        
        return updatedItem
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const totalDiscount = items.reduce((sum, item) => sum + ((item.quantity * item.unitPrice * item.discount) / 100), 0)
    const total = subtotal - totalDiscount
    return { subtotal, totalDiscount, total }
  }

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault()
    
    if (!selectedContactId) {
      toast.error("Veuillez sélectionner un client")
      return
    }
    
    if (items.length === 0) {
      toast.error("Veuillez ajouter au moins un article")
      return
    }

    setLoading(true)
    try {
      const { total } = calculateTotals()
      
      const quoteData = {
        number: quoteNumber,
        contactId: selectedContactId,
        validUntil,
        notes,
        items,
        amount: total,
        status: "DRAFT"
      }

      const response = await fetch("/api/sales/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteData)
      })

      if (response.ok) {
        toast.success("Devis créé avec succès")
        onSuccess?.()
        onOpenChange(false)
        
        // Déclencher la revalidation SWR
        // Le hook SWR écoutera automatiquement les changements
        window.dispatchEvent(new Event('quote-created'))
      } else {
        toast.error("Erreur lors de la création du devis")
      }
    } catch (error) {
      console.error("Error creating quote:", error)
      toast.error("Erreur lors de la création du devis")
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, totalDiscount, total } = calculateTotals()
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0 [&>*]:pointer-events-auto">
        <div className="bg-white min-h-full relative">
          {/* En-tête du document - Style devis compact */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6 relative z-10">
            {/* Ligne 1 : Titre et infos principales */}
            <div className="flex items-center justify-between mb-4" onClick={() => console.log("🎯 Clic sur div parent")}>
          
              <div className="flex items-center space-x-4">
                <div className="z-50">
                  <Label className="text-xs text-orange-100 uppercase block mb-1">Client</Label>
                  <Select 
                    value={selectedContactId} 
                    onValueChange={(value) => {
                      console.log("✅ Client sélectionné:", value)
                      setSelectedContactId(value)
                    }}
                    onOpenChange={(open) => {
                      console.log("📂 Select ouvert:", open)
                    }}
                    required
                  >
                    <SelectTrigger 
                      className="bg-white text-gray-900 border-orange-400 w-64 cursor-pointer relative z-50"
                      onClick={() => console.log("🖱️ Clic sur SelectTrigger détecté")}
                    >
                      <SelectValue placeholder={loadingContacts ? "Chargement..." : `Sélectionner un client (${contacts.length})`} />
                    </SelectTrigger>
                    <SelectContent 
                      className="z-[9999] max-h-[300px]" 
                      position="popper" 
                      sideOffset={5}
                      align="start"
                    >
                      <div className="p-2 border-b">
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          className="w-full justify-start text-orange-600 border-orange-300"
                          onClick={() => {
                            toast.info("Fonction d'ajout de client à venir")
                            // TODO: Ouvrir modal de création de contact
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter un nouveau client
                        </Button>
                      </div>
                      {loadingContacts ? (
                        <div className="p-4 text-sm text-gray-500 text-center">Chargement des contacts...</div>
                      ) : contacts.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">Aucun contact disponible</div>
                      ) : (
                        contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName} • {contact.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-px h-12 bg-orange-400/30"></div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-orange-100 uppercase block mb-1">N° Devis</Label>
                    <Input
                      value={quoteNumber}
                      onChange={(e) => setQuoteNumber(e.target.value)}
                      className="bg-white text-gray-900 font-mono border-orange-400 w-40"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-orange-100 uppercase block mb-1">Date</Label>
                    <Input
                      type="date"
                      value={new Date().toISOString().split('T')[0]}
                      disabled
                      className="bg-white/90 text-gray-900 border-orange-400 w-36"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-orange-100 uppercase block mb-1">Validité</Label>
                    <Input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="bg-white text-gray-900 border-orange-400 w-36"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ligne 2 : Infos client si sélectionné */}
            {selectedContact && (
              <div className="flex items-center space-x-4 text-xs text-orange-100 border-t border-orange-400/30 pt-3">
                <span className="font-semibold">{selectedContact.firstName} {selectedContact.lastName}</span>
                {selectedContact.job && <span>• {selectedContact.job}</span>}
                <span>• {selectedContact.email}</span>
                {selectedContact.phone && <span>• {selectedContact.phone}</span>}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8 pb-24">

            <Separator />

            {/* Articles - Tableau professionnel */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">Articles et prestations</h3>
                <Button type="button" onClick={addItem} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-t-2 border-gray-900">
                    <TableHead className="font-semibold text-gray-900">Description</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center w-20">Qté</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-right w-32">P.U. HT</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center w-24">Remise</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-right w-32">Total HT</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                        Cliquez sur "Ajouter une ligne" pour commencer
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={item.id} className="border-b">
                        <TableCell className="py-3">
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateItem(item.id, 'productId', value)}
                          >
                            <SelectTrigger className="mb-2">
                              <SelectValue placeholder="Choisir un produit..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Description détaillée..."
                            rows={2}
                            className="text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="text-center w-16"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              className="text-center w-16"
                            />
                            <span className="ml-1 text-sm text-gray-500">%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.total.toLocaleString()} XAF
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Totaux - Style facture professionnelle */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-96">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sous-total HT</span>
                      <span className="font-medium">{subtotal.toLocaleString()} XAF</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Remise globale</span>
                        <span className="font-medium text-red-600">-{totalDiscount.toLocaleString()} XAF</span>
                      </div>
                    )}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded">
                    <span className="text-lg font-bold">TOTAL HT</span>
                    <span className="text-2xl font-bold">{total.toLocaleString()} XAF</span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Notes et conditions */}
            <div>
              <Label className="text-sm font-semibold text-gray-500 uppercase">Notes et conditions</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conditions de paiement, modalités de livraison, conditions générales de vente..."
                rows={4}
                className="mt-2"
              />
              <div className="text-xs text-gray-500 text-center mt-4 space-y-1">
                <p>Ce devis est valable 30 jours à compter de sa date d'émission.</p>
                <p>En cas d'acceptation, ce devis doit être signé et retourné pour confirmation.</p>
              </div>
            </div>

          </form>

          {/* Boutons d'actions - fixés en bas du sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading} 
                className="bg-orange-600 hover:bg-orange-700 w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Enregistrement..." : "Enregistrer le devis"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
