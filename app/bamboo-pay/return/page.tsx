'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function BambooPayReturnPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
        }>
            <BambooPayReturnContent />
        </Suspense>
    )
}

function BambooPayReturnContent() {
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<string | null>(null)
    const [ref, setRef] = useState<string | null>(null)

    useEffect(() => {
        const paymentStatus = searchParams.get('status')
        const paymentRef = searchParams.get('ref')

        setStatus(paymentStatus)
        setRef(paymentRef)

        console.log('🔔 [BambooPay Return] Status:', paymentStatus, 'Ref:', paymentRef)

        // Envoyer le résultat à la fenêtre parent (POS)
        if (window.opener) {
            window.opener.postMessage({
                type: 'BAMBOO_PAY_RETURN',
                status: paymentStatus,
                ref: paymentRef,
            }, window.location.origin)

            // Fermer la popup après 3 secondes
            setTimeout(() => {
                window.close()
            }, 3000)
        }
    }, [searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
                {status === 'completed' ? (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="bg-green-100 rounded-full p-4">
                                <CheckCircle2 className="h-16 w-16 text-green-600" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-green-900">
                            Paiement Réussi !
                        </h1>
                        <p className="text-gray-600">
                            Votre paiement a été effectué avec succès.
                        </p>
                        {ref && (
                            <p className="text-sm text-gray-500">
                                Référence : <span className="font-mono">{ref}</span>
                            </p>
                        )}
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Fermeture automatique...</span>
                        </div>
                    </div>
                ) : status === 'failed' ? (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="bg-red-100 rounded-full p-4">
                                <XCircle className="h-16 w-16 text-red-600" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-red-900">
                            Paiement Échoué
                        </h1>
                        <p className="text-gray-600">
                            Le paiement n'a pas pu être effectué.
                        </p>
                        {ref && (
                            <p className="text-sm text-gray-500">
                                Référence : <span className="font-mono">{ref}</span>
                            </p>
                        )}
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Fermeture automatique...</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        </div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Traitement en cours...
                        </h1>
                    </div>
                )}
            </div>
        </div>
    )
}
