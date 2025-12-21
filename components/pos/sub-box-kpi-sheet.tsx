"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { 
  Loader2, 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SubBoxKpiSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
}

export function SubBoxKpiSheet({ open, onOpenChange, storeId }: SubBoxKpiSheetProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState("30")

  const loadKpiData = useCallback(async () => {
    if (!open || !storeId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/sub-box-kpi?days=${days}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error("Error loading KPI:", error)
    } finally {
      setLoading(false)
    }
  }, [open, storeId, days])

  useEffect(() => {
    loadKpiData()
  }, [loadKpiData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('XAF', 'FCFA')
  }

  // Préparer les données pour le graphique
  const chartData = data?.history?.map((day: any) => {
    const entry: any = {
      date: format(new Date(day.date), 'dd/MM', { locale: fr }),
      fullDate: day.date,
    }
    
    // Ajouter chaque sous-caisse comme une série
    Object.values(day.subBoxes).forEach((sb: any) => {
      entry[sb.name] = sb.count
    })
    
    return entry
  }).reverse() // Remettre dans l'ordre chronologique pour le graph

  // Couleurs pour les barres (palette de couleurs)
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#6366f1", // violet
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <SheetTitle>Performance Sous-Caisses</SheetTitle>
                <SheetDescription>
                  Suivi des commandes et bonus
                </SheetDescription>
              </div>
            </div>
            
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="15">15 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">3 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500">Chargement des données...</p>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-gray-500">
            Aucune donnée disponible
          </div>
        ) : (
          <div className="space-y-8 pb-10">
       

            {/* Graphique */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Évolution des commandes validées
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-0">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                      {data.summary.map((sb: any, index: number) => (
                        <Line
                          key={sb.id} 
                          type="monotone"
                          dataKey={sb.name} 
                          stroke={colors[index % colors.length]} 
                          strokeWidth={2}
                          dot={{ r: 3, fill: colors[index % colors.length] }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Détail par jour (Tableau Accordéon) */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                Détail par jour (Validés uniquement)
              </h3>
              
              <Accordion type="single" collapsible className="w-full space-y-2">
                {data.history.map((day: any) => (
                  <AccordionItem key={day.date} value={day.date} className="border rounded-lg bg-white overflow-hidden data-[state=open]:border-blue-200">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50/50">
                      <div className="flex flex-1 justify-between items-center mr-4">
                        <div className="font-medium text-gray-900">
                          {format(new Date(day.date), 'EEEE d MMMM yyyy', { locale: fr })}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                            <ShoppingCart className="h-3 w-3" />
                            {day.totalOrders}
                          </span>
                          <span className="flex items-center gap-1 font-bold text-green-600">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(day.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="border-t bg-gray-50/30 pb-2">
                      <div className="divide-y">
                        {Object.values(day.subBoxes)
                          .filter((sb: any) => sb.count > 0) // N'afficher que les sous-caisses actives ce jour-là
                          .sort((a: any, b: any) => b.count - a.count)
                          .map((sb: any) => (
                            <div key={sb.id} className="px-4 py-2.5 flex justify-between items-center hover:bg-gray-50">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full" 
                                  style={{ backgroundColor: colors[data.summary.findIndex((s: any) => s.id === sb.id) % colors.length] }} 
                                />
                                <span className="text-sm font-medium text-gray-700">{sb.name}</span>
                                <Badge variant="outline" className="text-[10px] h-5 bg-white">{sb.code}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-600">
                                  {sb.count} cde{sb.count > 1 ? 's' : ''}
                                </span>
                                <span className="w-24 text-right font-medium text-gray-900">
                                  {formatCurrency(sb.revenue)}
                                </span>
                              </div>
                            </div>
                          ))
                        }
                        {Object.values(day.subBoxes).filter((sb: any) => sb.count > 0).length === 0 && (
                          <div className="px-4 py-3 text-center text-sm text-gray-400 italic">
                            Aucune commande validée ce jour
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
