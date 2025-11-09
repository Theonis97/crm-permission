import { useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useSales() {
  const { data: quotes, error: quotesError, isLoading: quotesLoading, mutate: mutateQuotes } = useSWR(
    '/api/sales/quotes',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh toutes les 30 secondes
    }
  )

  const { data: invoices, error: invoicesError, isLoading: invoicesLoading, mutate: mutateInvoices } = useSWR(
    '/api/sales/invoices',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
    }
  )

  const { data: stats, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR(
    '/api/sales/stats',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
    }
  )

  // Écouter les événements de création/suppression pour revalider
  useEffect(() => {
    const handleQuoteCreated = () => {
      console.log('🔄 Événement quote-created détecté - Revalidation SWR')
      mutateQuotes()
      mutateStats()
    }

    const handleInvoiceCreated = () => {
      console.log('🔄 Événement invoice-created détecté - Revalidation SWR')
      mutateInvoices()
      mutateStats()
    }

    window.addEventListener('quote-created', handleQuoteCreated)
    window.addEventListener('invoice-created', handleInvoiceCreated)

    return () => {
      window.removeEventListener('quote-created', handleQuoteCreated)
      window.removeEventListener('invoice-created', handleInvoiceCreated)
    }
  }, [mutateQuotes, mutateInvoices, mutateStats])

  // Fonction pour créer un devis avec mutation optimiste
  const createQuote = async (quoteData: any) => {
    try {
      const response = await fetch('/api/sales/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      })

      if (!response.ok) throw new Error('Erreur lors de la création')

      const newQuote = await response.json()

      // Mutation optimiste : met à jour immédiatement le cache
      await mutateQuotes()
      await mutateStats()

      return { success: true, data: newQuote }
    } catch (error) {
      console.error('Error creating quote:', error)
      return { success: false, error }
    }
  }

  // Fonction pour créer une facture avec mutation optimiste
  const createInvoice = async (invoiceData: any) => {
    try {
      const response = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) throw new Error('Erreur lors de la création')

      const newInvoice = await response.json()

      // Mutation optimiste : met à jour immédiatement le cache
      await mutateInvoices()
      await mutateStats()

      return { success: true, data: newInvoice }
    } catch (error) {
      console.error('Error creating invoice:', error)
      return { success: false, error }
    }
  }

  // Fonction pour supprimer un devis
  const deleteQuote = async (id: string) => {
    try {
      console.log('🗑️ Suppression du devis:', id)
      const response = await fetch(`/api/sales/quotes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      const result = await response.json()

      // Mutation optimiste : met à jour immédiatement le cache
      console.log('🔄 Mutation SWR après suppression du devis')
      await mutateQuotes()
      await mutateStats()

      return { success: true, message: result.message }
    } catch (error) {
      console.error('Error deleting quote:', error)
      return { success: false, error }
    }
  }

  // Fonction pour supprimer une facture
  const deleteInvoice = async (id: string) => {
    try {
      console.log('🗑️ Suppression de la facture:', id)
      const response = await fetch(`/api/sales/invoices/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      const result = await response.json()

      // Mutation optimiste : met à jour immédiatement le cache
      console.log('🔄 Mutation SWR après suppression de la facture')
      await mutateInvoices()
      await mutateStats()

      return { success: true, message: result.message }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      return { success: false, error }
    }
  }

  // Fonction pour envoyer un devis par email
  const sendQuote = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/quotes/${id}/send`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi')

      const result = await response.json()

      // Mutation : revalide les données
      await mutateQuotes()
      await mutateStats()

      return { success: true, message: result.message }
    } catch (error) {
      console.error('Error sending quote:', error)
      return { success: false, error }
    }
  }

  // Fonction pour envoyer une facture par email
  const sendInvoice = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/invoices/${id}/send`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi')

      const result = await response.json()

      // Mutation : revalide les données
      await mutateInvoices()
      await mutateStats()

      return { success: true, message: result.message }
    } catch (error) {
      console.error('Error sending invoice:', error)
      return { success: false, error }
    }
  }

  return {
    // Données
    quotes: quotes || [],
    invoices: invoices || [],
    stats: stats || {
      totalQuotes: 0,
      totalInvoices: 0,
      totalRevenue: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      conversionRate: 0,
      averageQuoteValue: 0,
      averageInvoiceValue: 0,
    },
    
    // États de chargement
    isLoading: quotesLoading || invoicesLoading || statsLoading,
    quotesLoading,
    invoicesLoading,
    statsLoading,
    
    // Erreurs
    error: quotesError || invoicesError || statsError,
    
    // Actions avec mutations
    createQuote,
    createInvoice,
    deleteQuote,
    deleteInvoice,
    sendQuote,
    sendInvoice,
    
    // Mutations manuelles si besoin
    mutateQuotes,
    mutateInvoices,
    mutateStats,
  }
}
