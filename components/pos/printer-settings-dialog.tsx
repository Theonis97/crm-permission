"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Printer, 
  Save, 
  RotateCcw,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { toast } from "@/lib/app-toast"

interface PrinterSettings {
  // Informations du magasin
  storeName: string
  storeAddress: string
  storePhone: string
  
  // Paramètres d'impression
  paperWidth: number // 58mm ou 80mm
  autoprint: boolean // Impression automatique après vente
  copies: number // Nombre de copies
  
  // Personnalisation du ticket
  showLogo: boolean
  footerMessage: string
  showItemSKU: boolean
  
  // Format des prix
  currencySymbol: string
  showDecimals: boolean
}

interface PrinterSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
}

const DEFAULT_SETTINGS: PrinterSettings = {
  storeName: "Mon Magasin",
  storeAddress: "Libreville, Gabon",
  storePhone: "074813493",
  paperWidth: 58,
  autoprint: true,
  copies: 1,
  showLogo: false,
  footerMessage: "Merci de votre visite!\nA bientôt",
  showItemSKU: false,
  currencySymbol: "FCFA",
  showDecimals: false
}

export function PrinterSettingsDialog({
  open,
  onOpenChange,
  storeId
}: PrinterSettingsDialogProps) {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Charger les paramètres sauvegardés
  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open, storeId])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      
      // Essayer de charger depuis localStorage d'abord
      const savedSettings = localStorage.getItem(`printer-settings-${storeId}`)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } else {
        // Charger les infos du magasin depuis l'API
        const response = await fetch(`/api/stores/${storeId}`)
        if (response.ok) {
          const storeData = await response.json()
          setSettings(prev => ({
            ...prev,
            storeName: storeData.name || prev.storeName,
            storeAddress: storeData.address || prev.storeAddress,
            storePhone: storeData.phone || prev.storePhone
          }))
          
          // Sauvegarder automatiquement les infos du magasin
          const updatedSettings = {
            ...DEFAULT_SETTINGS,
            storeName: storeData.name || DEFAULT_SETTINGS.storeName,
            storeAddress: storeData.address || DEFAULT_SETTINGS.storeAddress,
            storePhone: storeData.phone || DEFAULT_SETTINGS.storePhone
          }
          localStorage.setItem(`printer-settings-${storeId}`, JSON.stringify(updatedSettings))
        }
      }
    } catch (error) {
      console.error("Erreur chargement paramètres:", error)
      toast.error("Erreur lors du chargement des paramètres")
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      
      // Sauvegarder dans localStorage
      localStorage.setItem(`printer-settings-${storeId}`, JSON.stringify(settings))
      
      toast.success("Paramètres d'impression sauvegardés !")
      onOpenChange(false)
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setIsSaving(false)
    }
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    toast.info("Paramètres réinitialisés")
  }

  const updateSetting = <K extends keyof PrinterSettings>(
    key: K,
    value: PrinterSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Settings className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Chargement des paramètres...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-blue-600" />
            Configuration d'imprimante
          </DialogTitle>
          <DialogDescription>
            Personnalisez les paramètres d'impression des tickets de caisse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
    
          {/* Paramètres d'impression */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">
              Paramètres d'impression
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paperWidth">Largeur du papier (mm)</Label>
                <select
                  id="paperWidth"
                  value={settings.paperWidth}
                  onChange={(e) => updateSetting("paperWidth", Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                >
                  <option value={58}>58mm (standard)</option>
                  <option value={80}>80mm (large)</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="copies">Nombre de copies</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="5"
                  value={settings.copies}
                  onChange={(e) => updateSetting("copies", Number(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Impression automatique</Label>
                  <p className="text-xs text-gray-500">
                    Imprimer automatiquement après chaque vente
                  </p>
                </div>
                <Switch
                  checked={settings.autoprint}
                  onCheckedChange={(checked) => updateSetting("autoprint", checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Personnalisation du ticket */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">
              Contenu du ticket
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Afficher les codes SKU</Label>
                  <p className="text-xs text-gray-500">
                    Montrer les références produits
                  </p>
                </div>
                <Switch
                  checked={settings.showItemSKU}
                  onCheckedChange={(checked) => updateSetting("showItemSKU", checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Afficher les décimales</Label>
                  <p className="text-xs text-gray-500">
                    Montrer les centimes dans les prix
                  </p>
                </div>
                <Switch
                  checked={settings.showDecimals}
                  onCheckedChange={(checked) => updateSetting("showDecimals", checked)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="footerMessage">Message de fin</Label>
              <Textarea
                id="footerMessage"
                value={settings.footerMessage}
                onChange={(e) => updateSetting("footerMessage", e.target.value)}
                placeholder="Message affiché en bas du ticket"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez \n pour créer une nouvelle ligne
              </p>
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Aperçu du ticket
            </h4>
            <div className="bg-white p-3 rounded border font-mono text-xs leading-relaxed">
              <div className="text-center font-bold">
                {settings.storeName.toUpperCase()}
              </div>
              {settings.storeAddress && (
                <div className="text-center text-xs">
                  {settings.storeAddress}
                </div>
              )}
              {settings.storePhone && (
                <div className="text-center text-xs">
                  TEL: {settings.storePhone}
                </div>
              )}
              <div className="text-center my-2">
                ================================
              </div>
              <div>Date: {new Date().toLocaleDateString('fr-FR')}</div>
              <div>Ticket: DEMO-001</div>
              <div className="my-2">
                --------------------------------
              </div>
              <div>1   PRODUIT EXEMPLE        5000 F</div>
              {settings.showItemSKU && (
                <div className="text-xs">    SKU: DEMO001</div>
              )}
              <div className="my-2">
                --------------------------------
              </div>
              <div className="flex justify-between">
                <span>TOTAL:</span>
                <span>5000 {settings.showDecimals ? '.00' : ''} {settings.currencySymbol}</span>
              </div>
              <div className="text-center mt-2 text-xs whitespace-pre-line">
                {settings.footerMessage}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={resetSettings}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <Settings className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook pour récupérer les paramètres d'impression
export function usePrinterSettings(storeId: string) {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS)
  
  useEffect(() => {
    const savedSettings = localStorage.getItem(`printer-settings-${storeId}`)
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch (error) {
        console.error("Erreur parsing settings:", error)
      }
    }
  }, [storeId])
  
  return settings
}
