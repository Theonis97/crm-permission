"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Printer, Mail, Download, ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { toast } from "@/lib/app-toast"

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [params.id])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/sales/invoices/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setInvoice(data)
      } else {
        toast.error("Facture non trouvée")
        router.push("/dashboard/sales")
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      toast.error("Erreur lors du chargement de la facture")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSendEmail = async () => {
    setSending(true)
    try {
      const response = await fetch(`/api/sales/invoices/${params.id}/send`, {
        method: "POST",
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchInvoice() // Recharger pour mettre à jour le statut
      } else {
        toast.error("Erreur lors de l'envoi")
      }
    } catch (error) {
      console.error("Error sending invoice:", error)
      toast.error("Erreur lors de l'envoi de la facture")
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice?.number} ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/sales/invoices/${params.id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        router.push("/dashboard/sales")
      } else {
        toast.error("Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast.error("Erreur lors de la suppression de la facture")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!invoice) return null

  const today = new Date(invoice.createdAt).toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre d'actions - cachée à l'impression */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={() => toast.info("Téléchargement PDF à venir")}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handleSendEmail} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Envoyer par email
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Document imprimable */}
      <div className="max-w-5xl mx-auto p-8 print:p-0">
        <div className="bg-white shadow-lg print:shadow-none">
          {/* En-tête */}
          <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-8 print:bg-green-600">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">FACTURE</h1>
                <p className="text-green-100">Sambatech CRM</p>
                <p className="text-sm text-green-100 mt-2">
                  {invoice.user.firstName} {invoice.user.lastName}<br />
                  {invoice.user.email}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold mb-2">{invoice.number}</div>
                <div className="text-sm text-green-100">Date : {today}</div>
                <div className="text-sm text-green-100">Échéance : {dueDate}</div>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    invoice.status === 'DRAFT' ? 'bg-gray-200 text-gray-800' :
                    invoice.status === 'SENT' ? 'bg-blue-200 text-blue-800' :
                    invoice.status === 'PAID' ? 'bg-green-200 text-green-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Corps du document */}
          <div className="p-8">
            {/* Client */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Facturer à</h3>
              <div className="bg-gray-50 p-4 rounded">
                <div className="font-semibold text-gray-900">
                  {invoice.contact.firstName} {invoice.contact.lastName}
                </div>
                {invoice.contact.job && <div className="text-gray-600">{invoice.contact.job}</div>}
                <div className="text-gray-600">{invoice.contact.email}</div>
                {invoice.contact.phone && <div className="text-gray-600">{invoice.contact.phone}</div>}
              </div>
            </div>

            {/* Articles */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 font-semibold">Description</th>
                  <th className="text-center py-2 font-semibold w-20">Qté</th>
                  <th className="text-right py-2 font-semibold w-32">P.U. HT</th>
                  <th className="text-right py-2 font-semibold w-32">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">
                      <div className="font-medium">{item.product.name}</div>
                      {item.product.sku && (
                        <div className="text-sm text-gray-600">Réf: {item.product.sku}</div>
                      )}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{item.unitPrice.toLocaleString()} XAF</td>
                    <td className="text-right font-semibold">
                      {(item.quantity * item.unitPrice).toLocaleString()} XAF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux avec TVA */}
            <div className="flex justify-end mb-8">
              <div className="w-96">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total HT</span>
                    <span className="font-medium">{invoice.subtotal.toLocaleString()} XAF</span>
                  </div>
                  {invoice.totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remise globale</span>
                      <span className="font-medium text-red-600">-{invoice.totalDiscount.toLocaleString()} XAF</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total HT</span>
                    <span className="font-medium">
                      {(invoice.subtotal - invoice.totalDiscount).toLocaleString()} XAF
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">TVA (18%)</span>
                    <span className="font-medium">{invoice.totalTax.toLocaleString()} XAF</span>
                  </div>
                </div>
                <div className="border-t-2 pt-2">
                  <div className="flex justify-between items-center bg-green-600 text-white p-4 rounded print:bg-green-600">
                    <span className="text-lg font-bold">TOTAL TTC</span>
                    <span className="text-2xl font-bold">{invoice.total.toLocaleString()} XAF</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    Montant à régler avant le {dueDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Conditions et modalités de règlement</h3>
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 whitespace-pre-wrap">
                  {invoice.notes}
                </div>
              </div>
            )}

            {/* Mentions légales */}
            <div className="text-xs text-gray-500 text-center space-y-1 pt-8 border-t">
              <p className="font-semibold">En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.</p>
              <p>TVA non applicable, article 293 B du CGI. Facture à conserver 10 ans.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
