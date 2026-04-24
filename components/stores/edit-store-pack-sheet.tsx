"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Loader2 } from "lucide-react"
import { toast } from "@/lib/app-toast"
import type { PackDetails } from "@/components/stores/store-pack-details-sheet"

interface EditStorePackSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  pack: PackDetails | null
  onSaved?: () => void
}

export function EditStorePackSheet({
  open,
  onOpenChange,
  storeId,
  pack,
  onSaved,
}: EditStorePackSheetProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (pack && open) {
      setName(pack.name)
      setDescription(pack.description ?? "")
      setSalePrice(
        pack.salePrice != null && !Number.isNaN(Number(pack.salePrice))
          ? String(pack.salePrice)
          : ""
      )
    }
  }, [pack, open])

  const save = async () => {
    if (!pack) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Le nom est requis")
      return
    }

    try {
      setLoading(true)
      const body: Record<string, unknown> = {
        name: trimmed,
        description: description.trim() === "" ? null : description.trim(),
      }
      if (salePrice.trim() === "") {
        body.salePrice = null
      } else {
        const n = Number(salePrice.replace(",", "."))
        if (Number.isNaN(n)) {
          toast.error("Prix invalide")
          return
        }
        body.salePrice = n
      }

      const res = await fetch(`/api/stores/${storeId}/packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Échec de la mise à jour")
        return
      }
      toast.success("Pack mis à jour")
      onOpenChange(false)
      onSaved?.()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  if (!pack) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Modifier le pack</SheetTitle>
          <SheetDescription>
            Nom, description et prix de vente du pack. La composition ne peut pas être modifiée ici.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="edit-pack-name">Nom</Label>
            <Input
              id="edit-pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-pack-desc">Description</Label>
            <Textarea
              id="edit-pack-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-pack-price">Prix de vente du pack (FCFA)</Label>
            <Input
              id="edit-pack-price"
              inputMode="decimal"
              placeholder="Vide = somme automatique des composants"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button type="button" onClick={save} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
