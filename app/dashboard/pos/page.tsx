"use client"

import { useState } from "react"
import { Search, Home, Truck, Users, Package, Calendar, CreditCard, Clock, Plus, Minus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { POSProduct, POSOrderItem } from "@/types/pos"

// Données statiques pour la démo
const categories = [
  { id: "all", name: "All Items" },
  { id: "specials", name: "Specials" },
  { id: "beverages", name: "Beverages" },
  { id: "desserts", name: "Desserts" },
  { id: "mains", name: "Mains" },
]

const products: POSProduct[] = [
  {
    id: "1",
    name: "Grilled Salmon",
    price: 24.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
  {
    id: "2",
    name: "Caesar Salad",
    price: 12.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
  {
    id: "3",
    name: "Spaghetti Carbonara",
    price: 8.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
  {
    id: "4",
    name: "Margherita Pizza",
    price: 16.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
  {
    id: "5",
    name: "Beef Steak",
    price: 28.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
  {
    id: "6",
    name: "Chicken Pasta",
    price: 14.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
  {
    id: "7",
    name: "Fish Tacos",
    price: 11.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
  {
    id: "8",
    name: "Vegetable Curry",
    price: 13.99,
    image: "/placeholder.svg?height=120&width=160",
    category: "mains",
  },
]

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderType, setOrderType] = useState<"takeaway" | "delivery" | "customer">("takeaway")
  const [orderItems, setOrderItems] = useState<POSOrderItem[]>([
    {
      id: "1",
      productId: "1",
      name: "Grilled Salmon",
      price: 49.98,
      quantity: 2,
      total: 49.98,
    },
    {
      id: "2",
      productId: "2",
      name: "Caesar Salad",
      price: 12.99,
      quantity: 1,
      total: 12.99,
    },
    {
      id: "3",
      productId: "6",
      name: "Iced Coffee",
      price: 9.98,
      quantity: 2,
      total: 9.98,
    },
  ])

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0)
  const serviceCharge = subtotal * 0.15
  const tax = subtotal * 0.1
  const total = subtotal + serviceCharge + tax

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToOrder = (product: POSProduct) => {
    const existingItem = orderItems.find((item) => item.productId === product.id)

    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.price }
            : item,
        ),
      )
    } else {
      const newItem: POSOrderItem = {
        id: Date.now().toString(),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price,
      }
      setOrderItems([...orderItems, newItem])
    }
  }

  const updateQuantity = (itemId: string, change: number) => {
    setOrderItems(
      orderItems
        .map((item) => {
          if (item.id === itemId) {
            const newQuantity = Math.max(0, item.quantity + change)
            if (newQuantity === 0) {
              return null
            }
            return {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.price,
            }
          }
          return item
        })
        .filter(Boolean) as POSOrderItem[],
    )
  }

  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId))
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-6">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">CT</span>
        </div>

        <nav className="flex flex-col space-y-4">
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0 bg-blue-50 text-blue-600">
            <Home className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
            <Truck className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
            <Package className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
            <Calendar className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
            <CreditCard className="w-5 h-5" />
          </Button>
        </nav>

        <div className="mt-auto">
          <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
            <Clock className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Products Section */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">February 26, 2024 • 2:12 PM</h1>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Online
                </Badge>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            <div className="flex space-x-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className={activeCategory === category.id ? "bg-blue-600 text-white" : ""}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addToOrder(product)}
                >
                  <div className="p-3">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                    <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                    <p className="text-blue-600 font-semibold">${product.price}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Order Panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Order Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex space-x-2">
                <Button
                  variant={orderType === "takeaway" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderType("takeaway")}
                  className={orderType === "takeaway" ? "bg-gray-800 text-white" : ""}
                >
                  Takeaway
                </Button>
                <Button
                  variant={orderType === "delivery" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderType("delivery")}
                  className={orderType === "delivery" ? "bg-blue-600 text-white" : ""}
                >
                  Delivery
                </Button>
                <Button
                  variant={orderType === "customer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderType("customer")}
                >
                  Customer
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-2">Ahmed Mohamed / Maaed / 01234567893</div>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Current Order</h2>
              <Button variant="ghost" size="sm" className="p-1">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Order Items */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="font-semibold">${item.total.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500">${item.price.toFixed(2)} each</div>
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-6 h-6 p-0 bg-transparent"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-6 h-6 p-0 bg-transparent"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Service Charge</span>
                <span>${serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <CreditCard className="w-4 h-4 mr-2" />
              Complete Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
