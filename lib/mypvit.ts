import { URLSearchParams } from 'url';

export interface RenewSecretResponse {
  operation_account_code: string;
  secret: string;
  expires_in: number;
}

export interface MyPvitErrorResponse {
  date: string;
  status_code: number;
  error: string;
  message?: string;
  messages?: string[];
  path: string;
}

export interface PaymentRequest {
  agent?: string;
  amount: number;
  product?: string;
  reference: string;
  service?: string;
  callback_url_code: string;
  customer_account_number: string;
  merchant_operation_account_code: string;
  transaction_type: 'PAYMENT' | 'GIVE_CHANGE';
  owner_charge?: 'MERCHANT' | 'CUSTOMER';
  owner_charge_operator?: string;
  free_info?: string;
  operator_code: 'AIRTEL_MONEY' | 'MOOV_MONEY';
}

export interface PaymentResponse {
  status: 'PENDING' | 'FAILED' | 'SUCCESS';
  status_code: string;
  operator: string;
  reference_id: string;
  merchant_reference_id: string;
  merchant_operation_account_code: string;
  message: string;
}

export interface PaymentCallback {
  transactionId: string;
  merchantReferenceId: string;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  customerID: string;
  fees: number;
  chargeOwner: 'MERCHANT' | 'CUSTOMER';
  transactionOperation: 'PAYMENT' | 'GIVE_CHANGE';
  operator: string;
  code: number;
}

export interface PaymentStatusResponse {
  date: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'AMBIGUOUS';
  amount: number;
  fees: number;
  operator: string;
  merchant_reference_id: string;
  customer_account_number: string;
  merchant_operation_account_code: string;
}

export class MyPvit {
  private baseUrl = 'https://api.mypvit.pro';
  private codeUrl: string;

  /**
   * Initialize the MyPvit client.
   * @param codeUrl The code URL for the account (e.g., "8T4UNT1OHIMZLJXC").
   */
  constructor(codeUrl: string) {
    this.codeUrl = codeUrl;
  }

  /**
   * Renews the X-Secret key for authentication.
   * 
   * Endpoint: POST /v2/{codeUrl}/renew-secret
   * 
   * @param operationAccountCode The operation account code (e.g., "ACC_PROD_001").
   * @param password The password for the account.
   * @param codeUrl Optional code URL to use for this request.
   * @returns Promise<RenewSecretResponse> containing the new secret.
   * @throws Error if the request fails (400, 401, 403, etc).
   */
  async renewSecret(operationAccountCode: string, password: string, codeUrl?: string): Promise<RenewSecretResponse> {
    const effectiveCodeUrl = codeUrl || this.codeUrl;
    const url = `${this.baseUrl}/v2/${effectiveCodeUrl}/renew-secret`;
    
    const params = new URLSearchParams();
    params.append('operationAccountCode', operationAccountCode);
    params.append('password', password);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        let errorData: MyPvitErrorResponse | null = null;
        try {
          errorData = await response.json() as MyPvitErrorResponse;
        } catch (e) {
          // Failed to parse JSON error response
        }

        if (errorData) {
          throw new Error(`MyPvit Error ${errorData.status_code}: ${errorData.error} - ${errorData.message}`);
        } else {
          throw new Error(`MyPvit HTTP Error: ${response.status} ${response.statusText}`);
        }
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while communicating with MyPvit API');
    }
  }

  /**
   * Initiates a USSD push payment request.
   * 
   * Endpoint: POST /v2/{codeUrl}/rest
   * 
   * @param secret The X-Secret key obtained from renewSecret.
   * @param data The payment request data.
   * @param codeUrl Optional code URL to use for this request.
   * @returns Promise<PaymentResponse> containing the transaction status.
   */
  async initiatePayment(secret: string, data: PaymentRequest, codeUrl?: string): Promise<PaymentResponse> {
    const effectiveCodeUrl = codeUrl || this.codeUrl;
    const url = `${this.baseUrl}/v2/${effectiveCodeUrl}/rest`;

    // Set default values for optional fields
    const requestData = {
      ...data,
      service: data.service || 'RESTFUL',
      owner_charge: data.owner_charge || 'MERCHANT',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': secret,
          'X-Callback-MediaType': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Try to parse the response regardless of status code first, as API might return error details in JSON
      let responseData: any;
      try {
        responseData = await response.json();
      } catch (e) {
        // If JSON parsing fails, we'll handle it below based on status code
      }

      if (!response.ok) {
        if (responseData && (responseData as MyPvitErrorResponse).error) {
          const errorData = responseData as MyPvitErrorResponse;
          // Log full response data for debugging
          console.error('MyPvit API Error Response:', JSON.stringify(responseData, null, 2));
          const msg = errorData.message || (errorData.messages && errorData.messages.join(', ')) || 'Unknown error';
          throw new Error(`MyPvit Error ${errorData.status_code}: ${errorData.error} - ${msg}`);
        } else if (responseData && (responseData as PaymentResponse).status === 'FAILED') {
             // API might return 400 with a PaymentResponse format
             return responseData as PaymentResponse;
        } else {
          // Try to log text if JSON parsing failed or structure is unknown
          const text = await response.text().catch(() => 'No body');
          console.error('MyPvit API HTTP Error Body:', text);
          throw new Error(`MyPvit HTTP Error: ${response.status} ${response.statusText}`);
        }
      }

      return responseData as PaymentResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while initiating payment');
    }
  }

  /**
   * Checks the status of a transaction.
   * 
   * Endpoint: GET /v2/{codeUrl}/status
   * Note: Uses a specific codeUrl for status check if different from the main one.
   * 
   * @param secret The X-Secret key obtained from renewSecret.
   * @param transactionId The transaction reference (e.g. merchant_reference_id).
   * @param accountOperationCode The operation account code.
   * @param transactionOperation The type of transaction (PAYMENT, GIVE_CHANGE).
   * @param statusCodeUrl Optional code URL specific for status check (defaults to instance codeUrl).
   * @returns Promise<PaymentStatusResponse> containing the transaction status.
   */
  async checkStatus(
    secret: string, 
    transactionId: string, 
    accountOperationCode: string, 
    transactionOperation: 'PAYMENT' | 'GIVE_CHANGE',
    statusCodeUrl?: string
  ): Promise<PaymentStatusResponse> {
    // Use the provided status code URL or fall back to the instance's codeUrl
    const effectiveCodeUrl = statusCodeUrl || this.codeUrl;
    
    // Construct query parameters
    const params = new URLSearchParams();
    params.append('transactionId', transactionId);
    params.append('accountOperationCode', accountOperationCode);
    params.append('transactionOperation', transactionOperation);

    const url = `${this.baseUrl}/v2/${effectiveCodeUrl}/status?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Secret': secret,
          'Content-Type': 'application/json'
        }
      });

      let responseData: any;
      try {
        responseData = await response.json();
      } catch (e) {
        // Failed to parse JSON
      }

      if (!response.ok) {
        if (responseData && (responseData as MyPvitErrorResponse).error) {
          const errorData = responseData as MyPvitErrorResponse;
          console.error('MyPvit Status API Error Response:', JSON.stringify(responseData, null, 2));
          const msg = errorData.message || (errorData.messages && errorData.messages.join(', ')) || 'Unknown error';
          throw new Error(`MyPvit Error ${errorData.status_code}: ${errorData.error} - ${msg}`);
        } else {
          const text = await response.text().catch(() => 'No body');
          console.error('MyPvit Status API HTTP Error Body:', text);
          throw new Error(`MyPvit HTTP Error: ${response.status} ${response.statusText}`);
        }
      }

      return responseData as PaymentStatusResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while checking transaction status');
    }
  }
}
