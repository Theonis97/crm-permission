/**
 * Service BambooPay pour les paiements Mobile Money
 * Documentation: bamboo_pay_api.md
 */

// Types pour BambooPay
export interface BambooPayInstantPaymentRequest {
  phone: string
  amount: string
  payer_name: string
  reference: string
  merchant_id: string
  callback_url: string
  operateur?: string | null
}

export interface BambooPayInstantPaymentResponse {
  reference_bp: string
  reference: string
  status: boolean
  message: string | null
}

export interface BambooPayStatusResponse {
  message: string
  code: number
  transaction: {
    status: "completed" | "pending" | "failed"
    code: number
    message: string
  }
}

export interface BambooPayConfig {
  username: string
  password: string
  merchantId: string
  baseUrl: string
  callbackUrl: string
}

// Statuts de paiement
export type PaymentStatus = "pending" | "completed" | "failed" | "timeout"

export interface PaymentResult {
  success: boolean
  status: PaymentStatus
  reference?: string
  referenceBp?: string
  message?: string
  error?: string
}

class BambooPayService {
  private config: BambooPayConfig

  constructor() {
    this.config = {
      username: process.env.BAMBOO_USERNAME || "",
      password: process.env.BAMBOO_PASSWORD || "",
      merchantId: process.env.BAMBOO_MERCHANT_ID || "",
      baseUrl: process.env.BAMBOO_BASE_URL || "https://client.bamboopay-ga.com/api",
      callbackUrl: process.env.BAMBOO_CALLBACK_URL || "",
    }
  }

  /**
   * Génère le header d'authentification Basic Auth
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")
    return `Basic ${credentials}`
  }

  /**
   * Effectue une requête POST vers l'API BambooPay
   */
  private async post<T>(endpoint: string, body?: object): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error: any = new Error(errorData.message || `HTTP ${response.status}`)
      error.status = response.status
      error.data = errorData
      throw error
    }

    return response.json()
  }

  /**
   * Vérifie si le service est configuré correctement
   */
  isConfigured(): boolean {
    return !!(
      this.config.username &&
      this.config.password &&
      this.config.merchantId
    )
  }

  /**
   * Formate le numéro de téléphone pour BambooPay
   * Accepte: 077000000, +241077000000, 241077000000
   * Retourne: 077000000
   */
  formatPhoneNumber(phone: string): string {
    // Supprimer les espaces et caractères spéciaux
    let cleaned = phone.replace(/[\s\-\.\(\)]/g, "")
    
    // Supprimer le + au début
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.substring(1)
    }
    
    // Supprimer le préfixe 241 (Gabon)
    if (cleaned.startsWith("241")) {
      cleaned = cleaned.substring(3)
    }
    
    // S'assurer que le numéro commence par 0
    if (!cleaned.startsWith("0") && cleaned.length === 8) {
      cleaned = "0" + cleaned
    }
    
    return cleaned
  }

  /**
   * Génère une référence unique pour la transaction
   */
  generateReference(prefix: string = "POS"): string {
    const now = new Date()
    const timestamp = now.getTime().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  /**
   * Initie un paiement instantané (Mobile Money)
   * Le client reçoit un push sur son téléphone pour valider le paiement
   */
  async initiateInstantPayment(
    phone: string,
    amount: number,
    payerName: string,
    reference?: string
  ): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: "failed",
        error: "Service BambooPay non configuré. Vérifiez les variables d'environnement.",
      }
    }

    const formattedPhone = this.formatPhoneNumber(phone)
    const paymentReference = reference || this.generateReference()

    try {
      console.log(`🔄 [BambooPay] Initiation paiement: ${formattedPhone} - ${amount} FCFA - Ref: ${paymentReference}`)

      const response = await this.post<BambooPayInstantPaymentResponse>(
        "/mobile/instant-payment",
        {
          phone: formattedPhone,
          amount: amount.toString(),
          payer_name: payerName,
          reference: paymentReference,
          merchant_id: this.config.merchantId,
          callback_url: this.config.callbackUrl,
          operateur: null, // Auto-détection par BambooPay
        }
      )

      console.log(`✅ [BambooPay] Paiement initié:`, response)

      if (response.status) {
        return {
          success: true,
          status: "pending",
          reference: response.reference,
          referenceBp: response.reference_bp,
          message: "Paiement initié. En attente de validation par le client.",
        }
      } else {
        return {
          success: false,
          status: "failed",
          reference: paymentReference,
          error: response.message || "Erreur lors de l'initiation du paiement",
        }
      }
    } catch (error: any) {
      console.error(`❌ [BambooPay] Erreur initiation:`, error.data || error.message)
      
      let errorMessage = "Erreur de connexion au service de paiement"
      
      if (error.status === 401) {
        errorMessage = "Identifiants BambooPay invalides"
      } else if (error.status === 422) {
        errorMessage = "Données de paiement invalides"
      } else if (error.data?.message) {
        errorMessage = error.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        status: "failed",
        reference: paymentReference,
        error: errorMessage,
      }
    }
  }

  /**
   * Vérifie le statut d'une transaction
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: "failed",
        error: "Service BambooPay non configuré",
      }
    }

    try {
      console.log(`🔍 [BambooPay] Vérification statut: ${transactionId}`)

      const response = await this.post<BambooPayStatusResponse>(
        `/check-status/${transactionId}`
      )

      console.log(`📊 [BambooPay] Statut:`, response)

      const status = response.transaction?.status || "pending"

      return {
        success: status === "completed",
        status: status as PaymentStatus,
        reference: transactionId,
        message: response.transaction?.message || response.message,
      }
    } catch (error: any) {
      console.error(`❌ [BambooPay] Erreur vérification:`, error.data || error.message)

      if (error.status === 404) {
        return {
          success: false,
          status: "pending",
          reference: transactionId,
          message: "Transaction non trouvée ou en cours de traitement",
        }
      }

      return {
        success: false,
        status: "failed",
        reference: transactionId,
        error: error.data?.message || error.message || "Erreur lors de la vérification du statut",
      }
    }
  }

  /**
   * Attend la confirmation du paiement avec polling
   * @param transactionId - ID de la transaction BambooPay
   * @param maxAttempts - Nombre maximum de tentatives (défaut: 6 = 1 minute avec intervalle de 10s)
   * @param intervalMs - Intervalle entre les tentatives en ms (défaut: 10000 = 10s)
   * @param onStatusUpdate - Callback appelé à chaque vérification
   */
  async waitForPaymentConfirmation(
    transactionId: string,
    maxAttempts: number = 6,
    intervalMs: number = 10000,
    onStatusUpdate?: (attempt: number, status: PaymentStatus, message?: string) => void
  ): Promise<PaymentResult> {
    console.log(`⏳ [BambooPay] Attente confirmation: ${transactionId} (max ${maxAttempts} tentatives, intervalle ${intervalMs}ms)`)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.checkPaymentStatus(transactionId)

      // Notifier le callback
      if (onStatusUpdate) {
        onStatusUpdate(attempt, result.status, result.message)
      }

      // Si le paiement est confirmé ou échoué, retourner immédiatement
      if (result.status === "completed") {
        console.log(`✅ [BambooPay] Paiement confirmé après ${attempt} tentative(s)`)
        return result
      }

      if (result.status === "failed") {
        console.log(`❌ [BambooPay] Paiement échoué après ${attempt} tentative(s)`)
        return result
      }

      // Si ce n'est pas la dernière tentative, attendre avant de réessayer
      if (attempt < maxAttempts) {
        console.log(`⏳ [BambooPay] Tentative ${attempt}/${maxAttempts} - En attente...`)
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
      }
    }

    // Timeout atteint
    console.log(`⏰ [BambooPay] Timeout après ${maxAttempts} tentatives`)
    return {
      success: false,
      status: "timeout",
      reference: transactionId,
      message: "Délai d'attente dépassé. Le paiement n'a pas été confirmé dans le temps imparti.",
    }
  }
}

// Export singleton
export const bambooPayService = new BambooPayService()

// Export de la classe pour les tests
export { BambooPayService }
