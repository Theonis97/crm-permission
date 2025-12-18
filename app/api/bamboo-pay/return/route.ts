import { NextRequest, NextResponse } from "next/server"

/**
 * Route de retour pour les paiements Bamboo Pay
 * 
 * Bamboo Pay redirige vers cette URL avec les paramètres :
 * - status: "completed" ou "failed"
 * - ref: Référence de la transaction (ex: "TXN-2025-003")
 * 
 * Cette route redirige ensuite vers le POS avec ces informations
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status") // "completed" ou "failed"
        const ref = searchParams.get("ref") // "TXN-2025-003" ou référence POS

        console.log(`🔔 [BambooPay Return] Status: ${status}, Ref: ${ref}`)

        // Extraire le storeId de la référence si elle commence par "POS-"
        // Format attendu: POS-XXXXX-YYYY
        // Pour l'instant, on redirige vers une page générique
        // TODO: Améliorer pour extraire le storeId de la session ou de la référence

        if (!status || !ref) {
            return NextResponse.json(
                { error: "Paramètres manquants" },
                { status: 400 }
            )
        }

        // Rediriger vers le POS avec les paramètres de paiement
        // Note: Vous devrez ajuster l'URL selon votre structure
        const redirectUrl = new URL('/dashboard/stores', request.url)
        redirectUrl.searchParams.set('bamboo_status', status)
        redirectUrl.searchParams.set('bamboo_ref', ref)

        return NextResponse.redirect(redirectUrl)
    } catch (error: any) {
        console.error('[BambooPay Return] Erreur:', error)
        return NextResponse.json(
            { error: "Erreur lors du traitement du retour" },
            { status: 500 }
        )
    }
}
