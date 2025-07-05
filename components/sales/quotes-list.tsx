"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Eye, Send, Copy, MoreHorizontal, Calendar, User, Euro, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Quote, QuoteStatus } from "@/types/sales"
import { cn } from "@/lib/utils"
import { CreateQuoteSheet } from "./create-quote-sheet"

interface QuotesListProps {
  onRefresh?: () => void
}

const statusConfig = {
  [QuoteStatus.DRAFT]: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-800",
    icon: "📝",
  },
  [QuoteStatus.SENT]: {
    label: "Envoyé",
    color: "bg-blue-100 text-blue-800",
    icon: "📤",
  },
  [QuoteStatus.VIEWED]: {
    label: "Consulté",
    color: "bg-purple-100 text-purple-800",
    icon: "👁️",
  },
  [QuoteStatus.ACCEPTED]: {
    label: "Accepté",
    color: "bg-green-100 text-green-800",
    icon: "✅",
  },
  [QuoteStatus.REJECTED]: {
    label: "Refusé",
    color: "bg-red-100 text-red-800",
    icon: "❌",
  },
  [QuoteStatus.EXPIRED]: {
    label: "Expiré",
    color: "bg-orange-100 text-orange-800",
    icon: "⏰",
  },
}

export function QuotesList({ onRefresh }: QuotesListProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchQuotes()
  }, [search, statusFilter])

  const fetchQuotes = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/quotes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
      }
    } catch (error) {
      console.error("Error fetching quotes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchQuotes()
        onRefresh?.()
      }
    } catch (error) {
      console.error("Error updating quote status:", error)
    }
  }

  const handleSendQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: "POST",
      })

      if (response.ok) {
        fetchQuotes()
        onRefresh?.()
      }
    } catch (error) {
      console.error("Error sending quote:", error)
    }
  }

  const handleQuoteCreated = () => {
    setShowCreateSheet(false)
    fetchQuotes()
    onRefresh?.()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const isExpiringSoon = (validUntil: Date) => {
    const today = new Date()
    const expiry = new Date(validUntil)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays > 0
  }

  // Auto-open create sheet if no quotes and no search/filter
  useEffect(() => {
    if (!loading && quotes.length === 0 && !search && statusFilter === "all") {
      setShowCreateSheet(true)
    }
  }, [loading, quotes.length, search, statusFilter])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Devis</CardTitle>
            <Button onClick={() => setShowCreateSheet(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Nouveau devis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro, client, titre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des devis */}
      <div className="space-y-4">
        {quotes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {search || statusFilter !== "all" ? "Aucun devis trouvé" : "Aucun devis"}
              </h3>
              <p className="text-gray-600 mb-4">
                {search || statusFilter !== "all"
                  ? "Aucun devis ne correspond à vos critères de recherche."
                  : "Le formulaire de création s'ouvrira automatiquement pour créer votre premier devis."}
              </p>
            </CardContent>
          </Card>
        ) : (
          quotes.map((quote) => {
            const status = statusConfig[quote.status]
            const expiringSoon = isExpiringSoon(quote.validUntil)

            return (
              <Card
                key={quote.id}
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer",
                  expiringSoon && quote.status === QuoteStatus.SENT && "border-orange-200 bg-orange-50",
                )}
                onClick={() => router.push(`/dashboard/sales/quotes/${quote.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{quote.number}</h3>
                        <Badge className={cn("text-xs", status.color)}>
                          {status.icon} {status.label}
                        </Badge>
                        {expiringSoon && quote.status === QuoteStatus.SENT && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            ⚠️ Expire bientôt
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-900 font-medium mb-1">{quote.title}</p>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {quote.contact.firstName} {quote.contact.lastName}
                          {quote.contact.job && <span className="ml-1">({quote.contact.job})</span>}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Expire le {formatDate(quote.validUntil)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-lg font-bold text-gray-900">
                          <Euro className="h-4 w-4 mr-1" />
                          {quote.total.toLocaleString()} xaf 
                        </div>

                        <div className="flex items-center space-x-2">
                          {quote.status === QuoteStatus.DRAFT && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendQuote(quote.id)
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Envoyer
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/sales/quotes/${quote.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir les détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/sales/quotes/${quote.id}/edit`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}}>
                                <Copy className="mr-2 h-4 w-4" />
                                Dupliquer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {quote.status !== QuoteStatus.ACCEPTED && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quote.id, QuoteStatus.ACCEPTED)}
                                  className="text-green-600"
                                >
                                  ✅ Marquer comme accepté
                                </DropdownMenuItem>
                              )}
                              {quote.status !== QuoteStatus.REJECTED && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quote.id, QuoteStatus.REJECTED)}
                                  className="text-red-600"
                                >
                                  ❌ Marquer comme refusé
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Sheet de création */}
      <CreateQuoteSheet open={showCreateSheet} onOpenChange={setShowCreateSheet} onQuoteCreated={handleQuoteCreated} />
    </div>
  )
}
