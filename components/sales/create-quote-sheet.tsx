"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, User, FileText, Calculator, Settings, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  job?: string
}

interface Product {
  id: string
  name: string
  price: number
  description?: string
}

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  productId?: string
}

interface CreateQuoteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuoteCreated: () => void
}

export function CreateQuoteSheet({ open, onOpenChange, onQuoteCreated }: CreateQuoteSheetProps) {
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [openSections, setOpenSections] = useState<string[]>(["client"])

  // Form state
  const [title, setTitle] = useState("")
  const [contactId, setContactId] = useState("")
  const [items, setItems] = useState<QuoteItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 },
  ])
  const [taxRate, setTaxRate] = useState(20)
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")
  const [validUntil, setValidUntil] = useState("")

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      fetchContacts()
      fetchProducts()
      // Set default valid until date (30 days from now)
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 30)
      setValidUntil(defaultDate.toISOString().split("T")[0])
    }
  }, [open])

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) newErrors.title = "Le titre est requis"
    if (!contactId) newErrors.contactId = "Le client est requis"
    if (!validUntil) newErrors.validUntil = "La date d'expiration est requise"

    items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item-${index}-description`] = "Description requise"
      }
      if (item.quantity <= 0) {
        newErrors[`item-${index}-quantity`] = "Quantité invalide"
      }
      if (item.unitPrice <= 0) {
        newErrors[`item-${index}-unitPrice`] = "Prix invalide"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateItemTotal = (item: QuoteItem) => {
    return item.quantity * item.unitPrice * (1 - item.discount / 100)
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate total for this item
    newItems[index].total = calculateItemTotal(newItems[index])

    setItems(newItems)
  }

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    }
    setItems([...items, newItem])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const addProductToItems = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      const newItem: QuoteItem = {
        id: Date.now().toString(),
        description: product.name,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        total: product.price,
        productId: product.id,
      }
      setItems([...items, newItem])
    }
  }

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = subtotal * (discount / 100)
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * (taxRate / 100)
  const total = taxableAmount + taxAmount

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contactId,
          items,
          taxRate,
          discount,
          notes,
          terms,
          validUntil,
        }),
      })

      if (response.ok) {
        onQuoteCreated()
        resetForm()
      }
    } catch (error) {
      console.error("Error creating quote:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setContactId("")
    setItems([{ id: "1", description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 }])
    setTaxRate(20)
    setDiscount(0)
    setNotes("")
    setTerms("")
    setValidUntil("")
    setErrors({})
    setOpenSections(["client"])
  }

  // Validation helpers for accordion badges
  const getClientSectionStatus = () => {
    const hasErrors = errors.title || errors.contactId || errors.validUntil
    const isComplete = title && contactId && validUntil
    return { hasErrors: !!hasErrors, isComplete: !!isComplete }
  }

  const getItemsSectionStatus = () => {
    const hasErrors = items.some(
      (_, index) =>
        errors[`item-${index}-description`] || errors[`item-${index}-quantity`] || errors[`item-${index}-unitPrice`],
    )
    const isComplete = items.every((item) => item.description.trim() && item.quantity > 0 && item.unitPrice > 0)
    return { hasErrors, isComplete }
  }

  const getCalculationsSectionStatus = () => {
    return { hasErrors: false, isComplete: true }
  }

  const getOptionsSectionStatus = () => {
    return { hasErrors: false, isComplete: true }
  }

  const getSectionBadge = (status: { hasErrors: boolean; isComplete: boolean }) => {
    if (status.hasErrors) {
      return (
        <Badge variant="destructive" className="ml-2">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Requis
        </Badge>
      )
    }
    if (status.isComplete) {
      return (
        <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Complet
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="ml-2">
        Optionnel
      </Badge>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Créer un devis
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-4">
            {/* Section Client */}
            <AccordionItem value="client" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Informations client</span>
                  {getSectionBadge(getClientSectionStatus())}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titre du devis *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Développement site web"
                      className={cn(errors.title && "border-red-500")}
                    />
                    {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <Label htmlFor="contact">Client *</Label>
                    <Select value={contactId} onValueChange={setContactId}>
                      <SelectTrigger className={cn(errors.contactId && "border-red-500")}>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName}
                            {contact.job && <span className="text-gray-500 ml-1">- {contact.job}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.contactId && <p className="text-sm text-red-500 mt-1">{errors.contactId}</p>}
                  </div>

                  <div>
                    <Label htmlFor="validUntil">Date d'expiration *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className={cn(errors.validUntil && "border-red-500")}
                    />
                    {errors.validUntil && <p className="text-sm text-red-500 mt-1">{errors.validUntil}</p>}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section Articles */}
            <AccordionItem value="items" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Articles & Services</span>
                  {getSectionBadge(getItemsSectionStatus())}
                  <Badge variant="outline" className="ml-2">
                    {items.length} article{items.length > 1 ? "s" : ""}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Quick add products */}
                  {products.length > 0 && (
                    <div>
                      <Label>Ajouter un produit</Label>
                      <Select onValueChange={addProductToItems}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.price}xaf 
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* Items list */}
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={item.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Article {index + 1}</h4>
                          {items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div>
                          <Label>Description *</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder="Description de l'article"
                            className={cn(errors[`item-${index}-description`] && "border-red-500")}
                          />
                          {errors[`item-${index}-description`] && (
                            <p className="text-sm text-red-500 mt-1">{errors[`item-${index}-description`]}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Quantité *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 0)}
                              className={cn(errors[`item-${index}-quantity`] && "border-red-500")}
                            />
                            {errors[`item-${index}-quantity`] && (
                              <p className="text-sm text-red-500 mt-1">{errors[`item-${index}-quantity`]}</p>
                            )}
                          </div>

                          <div>
                            <Label>Prix unitaire *</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                              className={cn(errors[`item-${index}-unitPrice`] && "border-red-500")}
                            />
                            {errors[`item-${index}-unitPrice`] && (
                              <p className="text-sm text-red-500 mt-1">{errors[`item-${index}-unitPrice`]}</p>
                            )}
                          </div>

                          <div>
                            <Label>Remise (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) => updateItem(index, "discount", Number.parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm text-gray-600">Total: </span>
                          <span className="font-semibold">{item.total.toFixed(2)} xaf </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button type="button" variant="outline" onClick={addItem} className="w-full bg-transparent">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un article
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section Calculs */}
            <AccordionItem value="calculations" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center">
                  <Calculator className="mr-2 h-4 w-4" />
                  <span>Calculs & Totaux</span>
                  {getSectionBadge(getCalculationsSectionStatus())}
                  <Badge variant="outline" className="ml-2">
                    {total.toFixed(2)} xaf 
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount">Remise globale (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={discount}
                        onChange={(e) => setDiscount(Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number.parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span>{subtotal.toFixed(2)} xaf </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Remise ({discount}%):</span>
                        <span>-{discountAmount.toFixed(2)} xaf </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>TVA ({taxRate}%):</span>
                      <span>{taxAmount.toFixed(2)} xaf </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total TTC:</span>
                      <span>{total.toFixed(2)} xaf </span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section Options */}
            <AccordionItem value="options" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Notes & Conditions</span>
                  {getSectionBadge(getOptionsSectionStatus())}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Notes internes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes visibles uniquement par vous"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="terms">Conditions générales</Label>
                    <Textarea
                      id="terms"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="Conditions qui apparaîtront sur le devis"
                      rows={3}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Fixed bottom actions */}
        <div className="flex-shrink-0 border-t bg-white p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total du devis:</span>
            <span className="text-xl font-bold">{total.toFixed(2)} xaf </span>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? "Création..." : "Créer le devis"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
