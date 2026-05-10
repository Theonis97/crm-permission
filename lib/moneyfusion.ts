import axios from "axios";

const MONEY_FUSION_FEE_RATE = 1.08;
const MONEY_FUSION_API_URL = process.env.MONEY_FUSION_PAYMENT_URL?.replace(
  /\/$/,
  "",
);
const MONEY_FUSION_CHECK_URL = "https://www.pay.moneyfusion.net/paiementNotif";

export interface PaymentData {
  totalPrice: number;
  article: Array<Record<string, number>>;
  personal_Info: Array<Record<string, any>>;
  numeroSend: string;
  nomclient: string;
  return_url?: string;
  webhook_url?: string;
}

export interface PaymentResponse {
  statut: boolean;
  token: string;
  message: string;
  url: string;
}

export interface PaymentStatusResponse {
  statut: boolean;
  data: {
    _id: string;
    tokenPay: string;
    numeroSend: string;
    nomclient: string;
    personal_Info: Array<Record<string, any>>;
    numeroTransaction: string;
    Montant: number;
    frais: number;
    statut: "pending" | "failure" | "no paid" | "paid";
    moyen: string;
    return_url: string;
    createdAt: string;
  };
  message: string;
}

export async function initiatePayment(
  paymentData: PaymentData,
): Promise<PaymentResponse> {
  if (!MONEY_FUSION_API_URL) {
    throw new Error("MONEY_FUSION_PAYMENT_URL is not set");
  }

  try {
    const response = await axios.post<PaymentResponse>(
      MONEY_FUSION_API_URL,
      paymentData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Money Fusion payment initiation error:", error);
    throw new Error("Failed to initiate payment");
  }
}

export async function checkPaymentStatus(
  token: string,
): Promise<PaymentStatusResponse> {
  try {
    const response = await axios.get<PaymentStatusResponse>(
      `${MONEY_FUSION_CHECK_URL}/${token}`,
    );
    return response.data;
  } catch (error) {
    console.error("Money Fusion payment status check error:", error);
    throw new Error("Failed to check payment status");
  }
}

export function calculateAmountToSend(displayedPrice: number): number {
  return Math.round(displayedPrice / MONEY_FUSION_FEE_RATE);
}

export { MONEY_FUSION_FEE_RATE };
