import { MyPvit, PaymentRequest, PaymentResponse, PaymentStatusResponse } from "./mypvit"
import { prisma } from "./prisma"

// Codes spécifiques pour chaque opération (fournis par l'utilisateur)
const MYPVIT_SECRET_CODE = "8T4UNT1OHIMZLJXC"
const MYPVIT_INIT_CODE = "ECNGKQMOFBAQIDWX"
const MYPVIT_STATUS_CODE = "YQJCR6PJP9JGIUCK"

// Credentials from environment
const MYPVIT_ACCOUNT_CODE = process.env.MYPVIT_ACCOUNT_CODE || ""
const MYPVIT_PASSWORD = process.env.MYPVIT_PASSWORD || ""
const MYPVIT_CALLBACK_URL_CODE = process.env.MYPVIT_CALLBACK_URL_CODE || ""

class MyPvitService {
  private client: MyPvit

  constructor() {
    // On initialise avec un code par défaut, mais on le surchargera pour chaque appel
    this.client = new MyPvit(MYPVIT_INIT_CODE)
  }

  isConfigured(): boolean {
    // On vérifie juste les identifiants de compte, les codes d'URL sont en dur
    return !!(MYPVIT_ACCOUNT_CODE && MYPVIT_PASSWORD)
  }

  /**
   * Retrieves a valid secret from the database or renews it if expired.
   */
  async getValidSecret(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("MyPVit service is not configured (missing env vars)")
    }

    // 1. Try to find an existing valid secret
    // We add a buffer of 5 minutes (300000ms) to ensure it doesn't expire during the request
    const now = new Date()
    const validSecret = await prisma.myPvitSecret.findFirst({
      where: {
        operation_account_code: MYPVIT_ACCOUNT_CODE,
        expires_at: {
          gt: new Date(now.getTime() + 5 * 60 * 1000) // Expires in > 5 mins
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    if (validSecret) {
      return validSecret.secret
    }

    // 2. If no valid secret, renew it
    console.log("[MyPVit] Renewing secret for account:", MYPVIT_ACCOUNT_CODE)
    try {
      // Utiliser le code spécifique pour la génération de secret
      const response = await this.client.renewSecret(
        MYPVIT_ACCOUNT_CODE, 
        MYPVIT_PASSWORD, 
        MYPVIT_SECRET_CODE
      )
      
      // Calculate expiration date
      // response.expires_in is in seconds usually
      const expiresInSeconds = response.expires_in
      const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000)

      // 3. Store the new secret
      await prisma.myPvitSecret.create({
        data: {
          operation_account_code: MYPVIT_ACCOUNT_CODE,
          secret: response.secret,
          expires_at: expiresAt
        }
      })

      return response.secret
    } catch (error) {
      console.error("[MyPVit] Failed to renew secret:", error)
      throw new Error("Failed to renew MyPVit secret")
    }
  }

  /**
   * Initiates a mobile money payment.
   */
  async initiatePayment(data: Omit<PaymentRequest, 'merchant_operation_account_code' | 'callback_url_code' | 'transaction_type'>): Promise<PaymentResponse> {
    const secret = await this.getValidSecret()

    const requestData: PaymentRequest = {
      ...data,
      merchant_operation_account_code: MYPVIT_ACCOUNT_CODE,
      callback_url_code: MYPVIT_CALLBACK_URL_CODE,
      transaction_type: 'PAYMENT',
    }

    // Utiliser le code spécifique pour l'initialisation de paiement
    return await this.client.initiatePayment(secret, requestData, MYPVIT_INIT_CODE)
  }

  /**
   * Checks the status of a transaction.
   */
  async checkStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const secret = await this.getValidSecret()
    
    // Utiliser le code spécifique pour le check status
    return await this.client.checkStatus(
      secret,
      transactionId,
      MYPVIT_ACCOUNT_CODE,
      'PAYMENT',
      MYPVIT_STATUS_CODE
    )
  }
}

export const myPvitService = new MyPvitService()
