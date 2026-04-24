"use client"

import { use, useCallback, useEffect, useState } from "react"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, PackageSearch, RotateCcw, TrendingDown } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "@/lib/app-toast"

interface PageProps {
  params: Promise<{ id: string }>
}

const SOURCE_LABEL: Record<string, string> = {
  SAV_PROCESS: "Traitement SAV",
  CASHIER_VALIDATION: "Caisse",
  POS_SUB_BOX: "Caisse POS (sous-caisse)",
}

export default function ReturnedGoodsPage({ params }: PageProps) {
  const { id: storeId } = use(params)
  const [tab, setTab] = useState<"lines" | "ranking">("lines")
  const [linesSubTab, setLinesSubTab] = useState<"pending" | "reintegrated">("pending")
  const [loading, setLoading] = useState(true)
  const [linesLoading, setLinesLoading] = useState(false)
  const [lines, setLines] = useState<any[]>([])
  const [ranking, setRanking] = useState<any[]>([])
  const [confirmLine, setConfirmLine] = useState<any | null>(null)
  const [reintegratingId, setReintegratingId] = useState<string | null>(null)

  const loadRanking = useCallback(async () => {
    const rRank = await fetch(
      `/api/stores/${storeId}/sav/returned-goods?ranking=1&take=50`
    ).then((r) => (r.ok ? r.json() : Promise.reject(new Error("classement"))))
    setRanking(rRank.ranking || [])
  }, [storeId])

  const loadLines = useCallback(async () => {
    const status = linesSubTab === "pending" ? "pending" : "reintegrated"
    const rLines = await fetch(
      `/api/stores/${storeId}/sav/returned-goods?take=100&status=${status}`
    ).then((r) => (r.ok ? r.json() : Promise.reject(new Error("lignes"))))
    setLines(rLines.lines || [])
  }, [storeId, linesSubTab])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        await loadRanking()
      } catch {
        toast.error("Impossible de charger le classement retours")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadRanking])

  useEffect(() => {
    const load = async () => {
      try {
        setLinesLoading(true)
        await loadLines()
      } catch {
        toast.error("Impossible de charger les lignes stock retours")
      } finally {
        setLinesLoading(false)
      }
    }
    load()
  }, [loadLines])

  const handleConfirmReintegrate = async () => {
    if (!confirmLine?.id) return
    setReintegratingId(confirmLine.id)
    try {
      const res = await fetch(
        `/api/stores/${storeId}/sav/returned-goods/${confirmLine.id}/reintegrate`,
        { method: "POST" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Réintégration impossible")
        return
      }
      toast.success(data.message || "Produit réintégré au stock magasin")
      setConfirmLine(null)
      await Promise.all([loadLines(), loadRanking()])
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setReintegratingId(null)
    }
  }

  const reintegratorLabel = (u: any) => {
    if (!u) return "—"
    if (u.firstName || u.lastName) {
      return [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
    }
    return u.name || u.email || "—"
  }

  return (
    <div className="flex flex-col">
      <StorePageHeader
        title="Stock retours SAV"
        description="Produits physiquement retournés, hors stock vendable — examen, réintégration ou décision ultérieure."
        icon={PackageSearch}
      />

      <div className="px-10 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "lines" | "ranking")}>
          <TabsList className="mb-4">
            <TabsTrigger value="lines">Stock retours</TabsTrigger>
            <TabsTrigger value="ranking">Produits les plus retournés</TabsTrigger>
          </TabsList>

          <TabsContent value="lines">
            <Tabs
              value={linesSubTab}
              onValueChange={(v) => setLinesSubTab(v as "pending" | "reintegrated")}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="pending">À traiter / réintégrer</TabsTrigger>
                <TabsTrigger value="reintegrated">Réintégrés</TabsTrigger>
              </TabsList>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {linesSubTab === "pending"
                      ? `En attente de réintégration (${lines.length})`
                      : `Réintégrés au stock vendable (${lines.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {linesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : lines.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {linesSubTab === "pending"
                        ? "Aucune ligne en attente. Les produits retournés apparaissent ici après clôture SAV / caisse."
                        : "Aucune réintégration enregistrée sur cette période (liste des 100 dernières)."}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Qté</TableHead>
                          <TableHead>État déclaré</TableHead>
                          <TableHead>Retour</TableHead>
                          <TableHead>Origine</TableHead>
                          {linesSubTab === "reintegrated" && (
                            <>
                              <TableHead>Réintégré le</TableHead>
                              <TableHead>Par</TableHead>
                            </>
                          )}
                          {linesSubTab === "pending" && (
                            <TableHead className="text-right">Action</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(row.createdAt), "dd/MM/yyyy HH:mm", {
                                locale: fr,
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">
                                {row.product?.name ?? "—"}
                              </div>
                              {row.variant?.name && (
                                <div className="text-xs text-muted-foreground">
                                  {row.variant.name}
                                </div>
                              )}
                              {row.product?.sku && (
                                <div className="text-xs text-muted-foreground">
                                  SKU {row.product.sku}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.condition}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.productReturn?.trackingNumber ||
                                row.productReturn?.number ||
                                "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[140px]">
                              {SOURCE_LABEL[row.source] ?? row.source}
                            </TableCell>
                            {linesSubTab === "reintegrated" && (
                              <>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {row.reintegratedAt
                                    ? format(new Date(row.reintegratedAt), "dd/MM/yyyy HH:mm", {
                                        locale: fr,
                                      })
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {reintegratorLabel(row.reintegratedBy)}
                                </TableCell>
                              </>
                            )}
                            {linesSubTab === "pending" && (
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => setConfirmLine(row)}
                                  disabled={reintegratingId === row.id}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Réintégrer
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Tabs>
          </TabsContent>

          <TabsContent value="ranking">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  <CardTitle>Classement (stock tampon — non réintégré)</CardTitle>
                </CardHeader>
                <CardContent>
                  {ranking.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Pas encore de lignes en attente de réintégration.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Unités (tampon)</TableHead>
                          <TableHead>Lignes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranking.map((row, i) => (
                          <TableRow key={row.productId}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">
                                {row.product?.name ?? row.productId}
                              </div>
                              {row.product?.sku && (
                                <div className="text-xs text-muted-foreground">
                                  SKU {row.product.sku}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {row.totalQuantity}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.returnEvents}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog
        open={!!confirmLine}
        onOpenChange={(open) => !open && setConfirmLine(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réintégrer au stock magasin ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Après contrôle / test, le produit sera ajouté au{" "}
                  <strong>stock vendable</strong> de ce magasin (rayon) et une entrée
                  sera enregistrée dans les mouvements de stock.
                </p>
                {confirmLine && (
                  <ul className="list-disc pl-5">
                    <li>
                      <strong>{confirmLine.product?.name ?? "Produit"}</strong> ×{" "}
                      {confirmLine.quantity}
                    </li>
                    <li>
                      Retour :{" "}
                      {confirmLine.productReturn?.trackingNumber ||
                        confirmLine.productReturn?.number ||
                        "—"}
                    </li>
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!reintegratingId}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmReintegrate()
              }}
              disabled={!!reintegratingId}
            >
              {reintegratingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmer la réintégration"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
