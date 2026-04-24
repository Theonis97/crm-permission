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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Save, X } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
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
  productName: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface CreateQuoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateQuoteModal({ open, onOpenChange, onSuccess }: CreateQuoteModalProps) {
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [products, setProducts] = useState<Product[]>([])
  
  // Données du devis
  const [quoteNumber, setQuoteNumber] = useState("")
  const [selectedContactId, setSelectedContactId] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuoteItem[]>([])

  useEffect(() => {
    if (open) {
      generateQuoteNumber()
      fetchContacts()
      fetchProducts()
      // Date par défaut : 30 jours
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 30)
      setValidUntil(defaultDate.toISOString().split('T')[0])
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
    try {
      const response = await fetch("/api/contacts")
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error("Error fetching contacts:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      productId: "",
      productName: "",
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
        
        // Si on change le produit, mettre à jour le prix
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value)
          if (product) {
            updatedItem.productName = product.name
            updatedItem.unitPrice = product.price
            updatedItem.description = product.name
          }
        }
        
        // Recalculer le total
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedContactId) {
      toast.error("Veuillez sélectionner un contact")
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
        resetForm()
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

  const resetForm = () => {
    setQuoteNumber("")
    setSelectedContactId("")
    setValidUntil("")
    setNotes("")
    setItems([])
  }

  const { subtotal, totalDiscount, total } = calculateTotals()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold">Créer un nouveau devis</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* En-tête du devis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div>
              <Label htmlFor="quoteNumber">Numéro de devis</Label>
              <Input
                id="quoteNumber"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="font-mono"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="contact">Client</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName} - {contact.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="validUntil">Valide jusqu'au</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Articles</h3>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un article
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Produit</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qté</TableHead>
                    <TableHead className="w-32">Prix unitaire</TableHead>
                    <TableHead className="w-24">Remise %</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Aucun article ajouté. Cliquez sur "Ajouter un article" pour commencer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateItem(item.id, 'productId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - {product.sku}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Description..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold">
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
          </div>

          {/* Totaux */}
          {items.length > 0 && (
            <div className="flex justify-end">
              <div className="w-80 space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span>Sous-total :</span>
                  <span className="font-medium">{subtotal.toLocaleString()} XAF</span>
                </div>
                <div className="flex justify-between">
                  <span>Remise totale :</span>
                  <span className="font-medium text-red-600">-{totalDiscount.toLocaleString()} XAF</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total :</span>
                    <span>{total.toLocaleString()} XAF</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes et conditions</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes, conditions de paiement, conditions de livraison..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Création..." : "Créer le devis"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
