"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  CheckCircle,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import { usePrinterSettings } from "@/components/pos/printer-settings-dialog"

interface SubBox {
  id: string
  name: string
  code: string
  isActive: boolean
  totalOrders: number
  pendingOrders: number
  createdAt: string
}

interface PosSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
}

export function PosSettingsSheet({ open, onOpenChange, storeId }: PosSettingsSheetProps) {
  const [activeTab, setActiveTab] = useState("settings")
  
  // Sub-boxes state
  const [subBoxes, setSubBoxes] = useState<SubBox[]>([])
  const [isLoadingSubBoxes, setIsLoadingSubBoxes] = useState(false)
  const [showSubBoxForm, setShowSubBoxForm] = useState(false)
  const [editingSubBox, setEditingSubBox] = useState<SubBox | null>(null)
  const [subBoxForm, setSubBoxForm] = useState({ name: "", code: "" })
  const [isSavingSubBox, setIsSavingSubBox] = useState(false)
  const [deletingSubBoxId, setDeletingSubBoxId] = useState<string | null>(null)

  // Printer settings
  const printerSettings = usePrinterSettings(storeId)
  const [localSettings, setLocalSettings] = useState({
    storeName: "",
    storeAddress: "",
    storePhone: "",
    footerMessage: "Merci de votre visite !",
    showLogo: true,
    autoprint: false,
  })

  // Load printer settings
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(`printer-settings-${storeId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setLocalSettings({
            storeName: parsed.storeName || "",
            storeAddress: parsed.storeAddress || "",
            storePhone: parsed.storePhone || "",
            footerMessage: parsed.footerMessage || "Merci de votre visite !",
            showLogo: parsed.showLogo ?? true,
            autoprint: parsed.autoprint ?? false,
          })
        } catch (e) {
          console.error("Error parsing printer settings:", e)
        }
      }
    }
  }, [open, storeId])

  // Load sub-boxes
  const loadSubBoxes = useCallback(async () => {
    if (!storeId) return
    setIsLoadingSubBoxes(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/sub-boxes`)
      const data = await response.json()
      if (data.success) {
        setSubBoxes(data.data)
      }
    } catch (error) {
      console.error("Error loading sub-boxes:", error)
      toast.error("Erreur lors du chargement des sous-caisses")
    } finally {
      setIsLoadingSubBoxes(false)
    }
  }, [storeId])

  useEffect(() => {
    if (open && activeTab === "subboxes") {
      loadSubBoxes()
    }
  }, [open, activeTab, loadSubBoxes])

  // Save printer settings
  const savePrinterSettings = () => {
    const settings = {
      ...localSettings,
      paperWidth: 80,
      fontSize: "medium",
      showDateTime: true,
      showOrderNumber: true,
      currencySymbol: "FCFA",
      showDecimals: false,
    }
    localStorage.setItem(`printer-settings-${storeId}`, JSON.stringify(settings))
    toast.success("Paramètres d'impression enregistrés")
  }

  // Sub-box CRUD
  const openCreateSubBox = () => {
    setEditingSubBox(null)
    setSubBoxForm({ name: "", code: "" })
    setShowSubBoxForm(true)
  }

  const openEditSubBox = (subBox: SubBox) => {
    setEditingSubBox(subBox)
    setSubBoxForm({ name: subBox.name, code: subBox.code })
    setShowSubBoxForm(true)
  }

  const cancelSubBoxForm = () => {
    setShowSubBoxForm(false)
    setEditingSubBox(null)
    setSubBoxForm({ name: "", code: "" })
  }

  const saveSubBox = async () => {
    if (!subBoxForm.name.trim() || !subBoxForm.code.trim()) {
      toast.error("Le nom et le code sont requis")
      return
    }

    setIsSavingSubBox(true)
    try {
      const url = editingSubBox
        ? `/api/stores/${storeId}/sub-boxes/${editingSubBox.id}`
        : `/api/stores/${storeId}/sub-boxes`
      
      const response = await fetch(url, {
        method: editingSubBox ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subBoxForm),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(editingSubBox ? "Sous-caisse modifiée" : "Sous-caisse créée")
        setShowSubBoxForm(false)
        setEditingSubBox(null)
        setSubBoxForm({ name: "", code: "" })
        loadSubBoxes()
      } else {
        toast.error(data.error || "Erreur lors de l'enregistrement")
      }
    } catch (error) {
      console.error("Error saving sub-box:", error)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSavingSubBox(false)
    }
  }

  const toggleSubBoxActive = async (subBox: SubBox) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/sub-boxes/${subBox.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !subBox.isActive }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(subBox.isActive ? "Sous-caisse désactivée" : "Sous-caisse activée")
        loadSubBoxes()
      } else {
        toast.error(data.error || "Erreur lors de la modification")
      }
    } catch (error) {
      console.error("Error toggling sub-box:", error)
      toast.error("Erreur lors de la modification")
    }
  }

  const deleteSubBox = async (subBoxId: string) => {
    setDeletingSubBoxId(subBoxId)
    try {
      const response = await fetch(`/api/stores/${storeId}/sub-boxes/${subBoxId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Sous-caisse supprimée")
        loadSubBoxes()
      } else {
        toast.error(data.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting sub-box:", error)
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeletingSubBoxId(null)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b bg-gray-50">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Settings className="h-5 w-5 text-gray-600" />
              Configuration POS
            </SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2 bg-gray-100">
              <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Settings className="h-4 w-4" />
                Paramètres
              </TabsTrigger>
              <TabsTrigger value="subboxes" className="flex items-center gap-2 data-[state=active]:bg-white">
                <Users className="h-4 w-4" />
                Sous-caisses
                {subBoxes.filter(s => s.pendingOrders > 0).length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                    {subBoxes.reduce((acc, s) => acc + s.pendingOrders, 0)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Onglet Paramètres */}
            <TabsContent value="settings" className="flex-1 overflow-auto px-6 py-4 m-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Informations du magasin</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="storeName" className="text-sm text-gray-600">Nom du magasin</Label>
                      <Input
                        id="storeName"
                        value={localSettings.storeName}
                        onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                        placeholder="Nom affiché sur les tickets"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storeAddress" className="text-sm text-gray-600">Adresse</Label>
                      <Input
                        id="storeAddress"
                        value={localSettings.storeAddress}
                        onChange={(e) => setLocalSettings({ ...localSettings, storeAddress: e.target.value })}
                        placeholder="Adresse du magasin"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="storePhone" className="text-sm text-gray-600">Téléphone</Label>
                      <Input
                        id="storePhone"
                        value={localSettings.storePhone}
                        onChange={(e) => setLocalSettings({ ...localSettings, storePhone: e.target.value })}
                        placeholder="Numéro de téléphone"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Options d'impression</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="footerMessage" className="text-sm text-gray-600">Message de pied de page</Label>
                      <Input
                        id="footerMessage"
                        value={localSettings.footerMessage}
                        onChange={(e) => setLocalSettings({ ...localSettings, footerMessage: e.target.value })}
                        placeholder="Message affiché en bas du ticket"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm text-gray-900">Afficher le logo</Label>
                        <p className="text-xs text-gray-500">Afficher le logo du magasin sur les tickets</p>
                      </div>
                      <Switch
                        checked={localSettings.showLogo}
                        onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showLogo: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm text-gray-900">Impression automatique</Label>
                        <p className="text-xs text-gray-500">Imprimer automatiquement après chaque vente</p>
                      </div>
                      <Switch
                        checked={localSettings.autoprint}
                        onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoprint: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={savePrinterSettings} className="w-full bg-gray-900 hover:bg-gray-800">
                    Enregistrer les paramètres
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Sous-caisses */}
            <TabsContent value="subboxes" className="flex-1 overflow-auto m-0 flex flex-col">
              {showSubBoxForm ? (
                /* Formulaire de création/modification */
                <div className="flex-1 flex flex-col">
                  <div className="px-6 py-4 border-b bg-white flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelSubBoxForm}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {editingSubBox ? "Modifier la sous-caisse" : "Nouvelle sous-caisse"}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {editingSubBox ? "Modifiez les informations de la sous-caisse" : "Créez une nouvelle sous-caisse"}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 px-6 py-6">
                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="subBoxName" className="text-sm font-medium text-gray-700">
                          Prénom de l'opérateur
                        </Label>
                        <Input
                          id="subBoxName"
                          value={subBoxForm.name}
                          onChange={(e) => setSubBoxForm({ ...subBoxForm, name: e.target.value })}
                          placeholder="Ex: Marie"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subBoxCode" className="text-sm font-medium text-gray-700">
                          Code de la sous-caisse
                        </Label>
                        <Input
                          id="subBoxCode"
                          value={subBoxForm.code}
                          onChange={(e) => setSubBoxForm({ ...subBoxForm, code: e.target.value.toUpperCase() })}
                          placeholder="Ex: SC01"
                          maxLength={6}
                          className="mt-1.5 uppercase"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                          Code unique pour identifier la sous-caisse (max 6 caractères)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <Button variant="outline" onClick={cancelSubBoxForm}>
                      Annuler
                    </Button>
                    <Button
                      onClick={saveSubBox}
                      disabled={isSavingSubBox || !subBoxForm.name.trim() || !subBoxForm.code.trim()}
                      className="bg-gray-900 hover:bg-gray-800"
                    >
                      {isSavingSubBox ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        editingSubBox ? "Modifier" : "Créer"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Liste des sous-caisses */
                <>
                  <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Sous-caisses</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Gérez les sous-caisses pour accélérer le processus de vente
                      </p>
                    </div>
                    <Button onClick={openCreateSubBox} size="sm" className="bg-gray-900 hover:bg-gray-800">
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto px-6 py-4">
                    {isLoadingSubBoxes ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : subBoxes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">Aucune sous-caisse configurée</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Créez des sous-caisses pour accélérer le flux de clients
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {subBoxes.map((subBox) => (
                          <div
                            key={subBox.id}
                            className={`border rounded-lg p-4 transition-colors ${
                              subBox.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                                  subBox.isActive ? "bg-gray-900 text-white" : "bg-gray-300 text-gray-600"
                                }`}>
                                  {subBox.code}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{subBox.name}</span>
                                    {!subBox.isActive && (
                                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      {subBox.totalOrders} commande{subBox.totalOrders !== 1 ? "s" : ""}
                                    </span>
                                    {subBox.pendingOrders > 0 && (
                                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                                        <Clock className="h-3 w-3" />
                                        {subBox.pendingOrders} en attente
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={subBox.isActive}
                                  onCheckedChange={() => toggleSubBoxActive(subBox)}
                                  className="mr-2"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditSubBox(subBox)}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSubBox(subBox.id)}
                                  disabled={deletingSubBoxId === subBox.id || subBox.pendingOrders > 0}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                                >
                                  {deletingSubBoxId === subBox.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  )
}
