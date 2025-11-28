/**
 * Service d'impression de tickets thermiques
 * Compatible avec les imprimantes ESC/POS
 */

export interface TicketData {
  // Informations du magasin
  storeName: string
  storeAddress?: string
  storePhone?: string
  storeLogo?: string
  
  // Informations de la vente
  ticketNumber: string
  date: Date
  cashier: string
  
  // Client
  customerName?: string
  customerPhone?: string
  
  // Articles
  items: Array<{
    name: string
    sku?: string
    quantity: number
    unitPrice: number
    total: number
    discount?: number
    discountAmount?: number
  }>
  
  // Totaux
  subtotal: number
  tax: number
  discount: number
  deliveryFee?: number
  total: number
  
  // Paiement
  paymentMethod: string
  amountPaid?: number
  change?: number
  
  // Notes
  notes?: string
}

export class ThermalPrinterService {
  private static instance: ThermalPrinterService
  
  public static getInstance(): ThermalPrinterService {
    if (!ThermalPrinterService.instance) {
      ThermalPrinterService.instance = new ThermalPrinterService()
    }
    return ThermalPrinterService.instance
  }

  /**
   * Génère le contenu du ticket au format texte
   */
  generateTicketContent(data: TicketData): string {
    const lines: string[] = []
    const width = 32 // Largeur standard pour imprimantes 58mm

    // Fonction utilitaire pour centrer le texte
    const centerText = (text: string): string => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2))
      return ' '.repeat(padding) + text
    }

    // Fonction pour aligner à droite
    const rightAlign = (text: string): string => {
      const padding = Math.max(0, width - text.length)
      return ' '.repeat(padding) + text
    }

    // Fonction pour créer une ligne avec texte à gauche et prix à droite
    const itemLine = (name: string, price: string): string => {
      const maxNameLength = width - price.length - 1
      const truncatedName = name.length > maxNameLength ? 
        name.substring(0, maxNameLength - 3) + '...' : name
      const padding = width - truncatedName.length - price.length
      return truncatedName + ' '.repeat(Math.max(1, padding)) + price
    }

    // En-tête du magasin
    lines.push(centerText('================================'))
    
    // Logo du magasin (si disponible et activé)
    if (data.storeLogo) {
      // Pour les imprimantes thermiques, on affiche un indicateur
      lines.push(centerText('*** LOGO ***'))
      lines.push('')
    }
    
    lines.push(centerText(data.storeName.toUpperCase()))
    
    if (data.storeAddress) {
      lines.push(centerText(data.storeAddress))
    }
    if (data.storePhone) {
      lines.push(centerText(`TEL: ${data.storePhone}`))
    }
    lines.push(centerText('================================'))
    lines.push('')

    // Informations du ticket
    const dateStr = data.date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    lines.push(`Date: ${dateStr}`)
    lines.push(`Ticket: ${data.ticketNumber}`)
    lines.push(`Caissier: ${data.cashier}`)
    
    if (data.customerName) {
      lines.push(`Client: ${data.customerName}`)
    }
    if (data.customerPhone) {
      lines.push(`Tel: ${data.customerPhone}`)
    }
    lines.push('')
    lines.push('--------------------------------')

    // Articles
    lines.push('QTE DESIGNATION        TOTAL')
    lines.push('--------------------------------')
    
    data.items.forEach(item => {
      // Ligne principale de l'article
      const qtyStr = item.quantity.toString().padStart(3)
      const priceStr = this.formatPrice(item.total)
      const nameMaxLength = width - qtyStr.length - priceStr.length - 2
      const truncatedName = item.name.length > nameMaxLength ? 
        item.name.substring(0, nameMaxLength - 3) + '...' : item.name
      
      lines.push(`${qtyStr} ${truncatedName.padEnd(nameMaxLength)} ${priceStr}`)
      
      // Prix unitaire si différent
      if (item.quantity > 1) {
        lines.push(`    ${this.formatPrice(item.unitPrice)} x ${item.quantity}`)
      }
      
      // SKU si disponible
      if (item.sku) {
        lines.push(`    SKU: ${item.sku}`)
      }
      
      // Réduction si applicable
      if (item.discount && item.discount > 0) {
        lines.push(`    Remise: -${item.discount}%`)
      } else if (item.discountAmount && item.discountAmount > 0) {
        lines.push(`    Remise: -${this.formatPrice(item.discountAmount)}`)
      }
    })

    lines.push('--------------------------------')

    // Totaux
    lines.push(itemLine('Sous-total:', this.formatPrice(data.subtotal)))
    
    if (data.discount > 0) {
      lines.push(itemLine('Remise:', `-${this.formatPrice(data.discount)}`))
    }
    
    if (data.tax > 0) {
      lines.push(itemLine('TVA:', this.formatPrice(data.tax)))
    }
    
    if (data.deliveryFee && data.deliveryFee > 0) {
      lines.push(itemLine('Frais livraison:', this.formatPrice(data.deliveryFee)))
    }

    lines.push('================================')
    lines.push(itemLine('TOTAL:', this.formatPrice(data.total)))
    lines.push('================================')

    // Paiement
    lines.push('')
    const paymentMethodName = this.getPaymentMethodName(data.paymentMethod)
    lines.push(`Mode de paiement: ${paymentMethodName}`)
    
    if (data.amountPaid && data.amountPaid !== data.total) {
      lines.push(itemLine('Reçu:', this.formatPrice(data.amountPaid)))
      if (data.change && data.change > 0) {
        lines.push(itemLine('Rendu:', this.formatPrice(data.change)))
      }
    }

    // Notes
    if (data.notes) {
      lines.push('')
      lines.push('Notes:')
      lines.push(data.notes)
    }

    // Pied de page
    lines.push('')
    lines.push(centerText('Merci de votre visite!'))
    lines.push(centerText('A bientôt'))
    lines.push('')
    lines.push('')
    lines.push('')

    return lines.join('\n')
  }

  /**
   * Formate un prix en FCFA
   */
  private formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' F'
  }

  /**
   * Convertit le code de paiement en nom lisible
   */
  private getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      'CASH': 'Espèces',
      'CARD': 'Carte bancaire',
      'MOBILE': 'Mobile Money',
      'CHECK': 'Chèque',
      'cash': 'Espèces',
      'card': 'Carte bancaire',
      'mobile': 'Mobile Money',
      'check': 'Chèque'
    }
    return methods[method] || method
  }

  /**
   * Imprime le ticket via l'API Web Print
   */
  async printTicket(data: TicketData): Promise<boolean> {
    try {
      const content = this.generateTicketContent(data)
      
      // Créer un élément pour l'impression
      const printWindow = window.open('', '_blank', 'width=400,height=600')
      if (!printWindow) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'impression')
      }

      // Générer le contenu HTML simple
      const logoSection = data.storeLogo ? 
        `<div style="text-align: center; margin-bottom: 10px;"><img src="${data.storeLogo}" alt="Logo" style="max-width: 50mm; max-height: 20mm; object-fit: contain;" /></div>` : ''
      
      // HTML simplifié pour éviter les erreurs
      const printContent = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        `<title>Ticket ${data.ticketNumber}</title>`,
        '<style>',
        '@page { size: 58mm auto; margin: 0; }',
        'body { font-family: "Courier New", monospace; font-size: 12px; line-height: 1.2; margin: 0; padding: 2mm; white-space: pre-wrap; }',
        '@media print { body { font-size: 10px; } }',
        '</style>',
        '</head>',
        '<body>',
        logoSection,
        content.replace(/\n/g, '<br>'),
        '</body>',
        '</html>'
      ].join('')

      printWindow.document.write(printContent)
      printWindow.document.close()

      // Attendre que le contenu soit chargé puis imprimer
      setTimeout(() => {
        try {
          printWindow.print()
          setTimeout(() => {
            printWindow.close()
          }, 100)
        } catch (printError) {
          console.error('Erreur lors de l\'impression:', printError)
          printWindow.close()
        }
      }, 500)

      return true
    } catch (error: any) {
      console.error('Erreur lors de l\'impression:', error)
      throw error
    }
  }

  /**
   * Prévisualise le ticket dans une nouvelle fenêtre
   */
  async previewTicket(data: TicketData): Promise<void> {
    const content = this.generateTicketContent(data)
    
    const previewWindow = window.open('', '_blank', 'width=400,height=600')
    if (!previewWindow) {
      throw new Error('Impossible d\'ouvrir la fenêtre de prévisualisation')
    }
    
    // Générer le logo pour la prévisualisation
    const logoSection = data.storeLogo ? 
      `<div style="text-align: center; margin-bottom: 10px;"><img src="${data.storeLogo}" alt="Logo" style="max-width: 50mm; max-height: 20mm; object-fit: contain;" /></div>` : ''

    const previewContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prévisualisation - Ticket ${data.ticketNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            margin: 20px;
            background: #f5f5f5;
          }
          
          .ticket {
            background: white;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            white-space: pre-wrap;
            word-wrap: break-word;
            max-width: 300px;
            margin: 0 auto;
          }
          
          .actions {
            text-align: center;
            margin: 20px 0;
          }
          
          button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 0 10px;
            font-size: 14px;
          }
          
          button:hover {
            background: #0056b3;
          }
          
          .close-btn {
            background: #6c757d;
          }
          
          .close-btn:hover {
            background: #545b62;
          }
        </style>
      </head>
      <body>
        <div class="actions">
          <button onclick="window.print()">🖨️ Imprimer</button>
          <button class="close-btn" onclick="window.close()">❌ Fermer</button>
        </div>
        <div class="ticket">
          ${logoSection}
          ${content.replace(/\n/g, '<br>')}
        </div>
        <div class="actions">
          <button onclick="window.print()">🖨️ Imprimer</button>
          <button class="close-btn" onclick="window.close()">❌ Fermer</button>
        </div>
      </body>
      </html>
    `

    previewWindow.document.write(previewContent)
    previewWindow.document.close()
  }

  /**
   * Vérifie si l'impression est supportée
   */
  isPrintSupported(): boolean {
    return typeof window !== 'undefined' && 'print' in window
  }
}

// Export de l'instance singleton
export const thermalPrinter = ThermalPrinterService.getInstance()
