"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { RefreshCw, CheckCircle2, AlertCircle, Package } from "lucide-react"
import { toast } from "@/lib/app-toast"

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    if (!confirm("Voulez-vous synchroniser tous les produits des magasins à partir des commandes confirmées/livrées ?")) {
      return
    }

    setSyncing(true)
    setResult(null)

    try {
      const response = await fetch("/api/stores/sync-products", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la synchronisation")
      }

      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        toast.success("Synchronisation terminée avec succès !")
      } else {
        toast.error("Erreur lors de la synchronisation")
      }
    } catch (error: any) {
      console.error("Sync error:", error)
      toast.error(error.message || "Erreur lors de la synchronisation")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <ModuleNavbar
        title="Synchronisation des produits"
        description="Synchroniser les produits des magasins avec les commandes"
        icon={RefreshCw}
      />

      <div className="py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Carte d'information */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-blue-900">Synchronisation des produits</CardTitle>
                  <CardDescription className="text-blue-700">
                    Cette action va créer les produits manquants dans les magasins
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-blue-800">
                <p>
                  <strong>Cette synchronisation va :</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Récupérer toutes les commandes avec le statut CONFIRMED ou DELIVERED</li>
                  <li>Créer les StoreProduct manquants pour chaque magasin</li>
                  <li>Mettre à jour les stocks existants en ajoutant les quantités</li>
                  <li>Permettre aux produits d'apparaître dans l'espace du magasin</li>
                </ul>
                <p className="text-blue-900 font-medium mt-4">
                  ⚠️ Cette action est sécurisée et ne supprime aucune donnée.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bouton d'action */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  size="lg"
                  className="w-full max-w-md"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Synchronisation en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Lancer la synchronisation
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  Cette opération peut prendre quelques secondes selon le nombre de commandes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Résultats */}
          {result && (
            <Card className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  )}
                  <CardTitle className={result.success ? "text-green-900" : "text-red-900"}>
                    {result.message}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="text-sm text-gray-600">Commandes traitées</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {result.stats.ordersProcessed}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-sm text-gray-600">Produits créés</div>
                        <div className="text-2xl font-bold text-green-600">
                          {result.stats.storeProductsCreated}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="text-sm text-gray-600">Stocks mis à jour</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {result.stats.storeProductsUpdated}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="text-sm text-gray-600">Erreurs</div>
                        <div className="text-2xl font-bold text-red-600">
                          {result.stats.errors}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">Erreurs détaillées :</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                        {result.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
