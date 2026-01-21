"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Clock,
  Calendar,
  Timer,
  LogIn,
  LogOut,
  TrendingUp,
  Loader2,
  Edit3,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface DailyLog {
  date: string
  checkIn: string | null
  checkOut: string | null
  hours: number
  isManual: boolean
  logs: Array<{
    id: string
    type: string
    method: string
    timestamp: string
    isFlagged: boolean
    flagReason: string | null
    notes: string | null
  }>
}

interface UserHistory {
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
    matricule: string | null
  }
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalHours: number
    daysWorked: number
    avgHoursPerDay: number
  }
  dailyLogs: DailyLog[]
}

interface EmployeeHistorySheetProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  userName: string
  onEditDay?: (userId: string, date: string, checkIn: string | null, checkOut: string | null) => void
}

export function EmployeeHistorySheet({
  isOpen,
  onClose,
  userId,
  userName,
  onEditDay,
}: EmployeeHistorySheetProps) {
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<UserHistory | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })

  useEffect(() => {
    if (isOpen && userId) {
      fetchHistory()
    }
  }, [isOpen, userId, startDate, endDate])

  const fetchHistory = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const response = await fetch(
        `/api/attendance/user-history?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      } else {
        toast.error("Erreur lors du chargement de l'historique")
      }
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  const getHoursColor = (hours: number) => {
    if (hours >= 8) return "text-green-600"
    if (hours >= 6) return "text-yellow-600"
    if (hours > 0) return "text-orange-600"
    return "text-gray-400"
  }

  const getUserDisplayName = () => {
    if (history?.user) {
      if (history.user.firstName && history.user.lastName) {
        return `${history.user.firstName} ${history.user.lastName}`
      }
      return history.user.name || history.user.email
    }
    return userName
  }

  const getUserInitials = () => {
    if (history?.user) {
      if (history.user.firstName && history.user.lastName) {
        return `${history.user.firstName[0]}${history.user.lastName[0]}`
      }
      if (history.user.name) {
        return history.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
      }
      return history.user.email[0]?.toUpperCase() || "U"
    }
    return userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-cyan-100 text-cyan-700 text-lg font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{getUserDisplayName()}</SheetTitle>
              {history?.user?.matricule && (
                <p className="text-sm text-gray-500 font-mono">
                  {history.user.matricule}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Filtres de période */}
        <div className="p-4 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Du</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Au</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Résumé */}
        {history && (
          <div className="p-4 border-b">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl p-4 border border-cyan-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="h-4 w-4 text-cyan-600" />
                  <span className="text-xs text-gray-600">Total heures</span>
                </div>
                <p className="text-2xl font-bold text-cyan-700">
                  {history.summary.totalHours}h
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-gray-600">Jours travaillés</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">
                  {history.summary.daysWorked}
                </p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4 border border-violet-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  <span className="text-xs text-gray-600">Moyenne/jour</span>
                </div>
                <p className="text-2xl font-bold text-violet-700">
                  {history.summary.avgHoursPerDay}h
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Liste des jours */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
          ) : history?.dailyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mb-3 text-gray-300" />
              <p>Aucun pointage sur cette période</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="text-center font-semibold">Arrivée</TableHead>
                  <TableHead className="text-center font-semibold">Départ</TableHead>
                  <TableHead className="text-center font-semibold">Heures</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.dailyLogs.map((day) => (
                  <TableRow key={day.date} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize text-sm">
                          {formatDate(day.date)}
                        </span>
                        {day.isManual && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Manuel
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {day.checkIn ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                          <LogIn className="h-3 w-3" />
                          {formatTime(day.checkIn)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {day.checkOut ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium">
                          <LogOut className="h-3 w-3" />
                          {formatTime(day.checkOut)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("font-bold text-sm", getHoursColor(day.hours))}>
                        {day.hours > 0 ? `${day.hours}h` : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {onEditDay && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-cyan-600"
                          onClick={() => onEditDay(
                            userId!,
                            day.date,
                            day.checkIn ? formatTime(day.checkIn) : null,
                            day.checkOut ? formatTime(day.checkOut) : null
                          )}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer avec info */}
        <div className="p-4 border-t bg-gray-50/50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>
              Les entrées marquées "Manuel" ont été saisies manuellement par un administrateur.
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
