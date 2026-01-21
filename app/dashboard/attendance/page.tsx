"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent } from "@/components/ui/card"
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import {
    Clock,
    Users,
    Smartphone,
    Calendar,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Search,
    MoreHorizontal,
    Link2,
    Check,
    X,
    AlertCircle,
    Copy,
    RefreshCw,
    LogIn,
    LogOut,
    Timer,
    UserCheck,
    UserX,
    Monitor,
    Plus,
    Power,
    Trash2,
    Settings,
    QrCode,
    Edit3,
    History,
} from "lucide-react"
import { EmployeeHistorySheet, ManualEntryDialog } from "@/components/attendance"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface AttendanceUser {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
    matricule: string | null
    status: string
    attendanceDevices: Array<{
        id: string
        deviceId: string
        deviceName: string | null
        platform: string | null
        status: string
        lastSeenAt: string | null
    }>
    attendanceLogs: Array<{
        id: string
        type: string
        method: string
        timestamp: string
        isFlagged: boolean
    }>
    checkIn: string | null
    checkOut: string | null
    hoursWorked: number
    hasDevice: boolean
    deviceStatus: string | null
}

interface Terminal {
    id: string
    code: string
    name: string
    location: string | null
    type: string
    status: string
    createdAt: string
    updatedAt: string
    _count: {
        qrTokens: number
        logs: number
    }
}

interface AttendanceStats {
    period: string
    startDate: string
    endDate: string
    expectedHoursPerDay: number
    expectedTotalHours: number
    totalUsers: number
    avgHoursAll: number
    userStats: Array<{
        user: {
            id: string
            firstName: string | null
            lastName: string | null
            name: string | null
            matricule: string | null
        }
        totalHours: number
        daysWorked: number
        avgHoursPerDay: number
    }>
}

export default function AttendancePage() {
    const { hasPermission } = usePermissions()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTab, setActiveTab] = useState("daily")
    const [statsPeriod, setStatsPeriod] = useState<"week" | "month">("week")
    const [generatingLink, setGeneratingLink] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [registrationLink, setRegistrationLink] = useState<string | null>(null)
    const [showLinkDialog, setShowLinkDialog] = useState(false)
    const [showTerminalDialog, setShowTerminalDialog] = useState(false)
    const [newTerminalName, setNewTerminalName] = useState("")
    const [newTerminalLocation, setNewTerminalLocation] = useState("")
    const [selectedTerminalCode, setSelectedTerminalCode] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    // États pour les modals d'historique et saisie manuelle
    const [showHistorySheet, setShowHistorySheet] = useState(false)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("")
    const [showManualEntryDialog, setShowManualEntryDialog] = useState(false)
    const [manualEntryUserId, setManualEntryUserId] = useState<string | null>(null)
    const [manualEntryUserName, setManualEntryUserName] = useState("")
    const [manualEntryDate, setManualEntryDate] = useState<string | null>(null)
    const [manualEntryCheckIn, setManualEntryCheckIn] = useState<string | null>(null)
    const [manualEntryCheckOut, setManualEntryCheckOut] = useState<string | null>(null)

    // Fetcher pour SWR
    const fetcher = (url: string) => fetch(url).then(res => res.json())

    // SWR pour les données de pointage avec rafraîchissement automatique
    const dateStr = selectedDate.toISOString().split("T")[0]
    const { data: users = [], isLoading: loading, mutate: mutateUsers } = useSWR<AttendanceUser[]>(
        `/api/attendance?date=${dateStr}`,
        fetcher,
        { refreshInterval: 30000, revalidateOnFocus: true }
    )

    // SWR pour les stats
    const { data: stats, mutate: mutateStats } = useSWR<AttendanceStats>(
        `/api/attendance/stats?period=${statsPeriod}`,
        fetcher,
        { refreshInterval: 60000 }
    )

    // SWR pour les terminaux
    const { data: terminals = [], mutate: mutateTerminals } = useSWR<Terminal[]>(
        "/api/attendance/terminals",
        fetcher,
        { refreshInterval: 60000 }
    )

    const generateRegistrationLink = async (userId: string) => {
        setGeneratingLink(true)
        setSelectedUserId(userId)
        try {
            const response = await fetch("/api/attendance/register-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            })

            const data = await response.json()
            console.log("Register link response:", response.status, data)
            
            if (response.ok) {
                setRegistrationLink(data.registerUrl)
                setShowLinkDialog(true)
                toast.success("Lien généré avec succès")
            } else {
                toast.error(data.error || "Erreur lors de la génération du lien")
            }
        } catch (error) {
            toast.error("Erreur lors de la génération du lien")
        } finally {
            setGeneratingLink(false)
        }
    }

    const approveDevice = async (deviceId: string) => {
        try {
            const response = await fetch("/api/attendance/devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceId, action: "approve" }),
            })

            if (response.ok) {
                toast.success("Appareil approuvé")
                mutateUsers()
            } else {
                toast.error("Erreur lors de l'approbation")
            }
        } catch (error) {
            toast.error("Erreur lors de l'approbation")
        }
    }

    const revokeDevice = async (deviceId: string) => {
        try {
            const response = await fetch("/api/attendance/devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceId, action: "revoke" }),
            })

            if (response.ok) {
                toast.success("Appareil révoqué")
                mutateUsers()
            } else {
                toast.error("Erreur lors de la révocation")
            }
        } catch (error) {
            toast.error("Erreur lors de la révocation")
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Lien copié dans le presse-papier")
    }

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate)
        newDate.setDate(newDate.getDate() + days)
        setSelectedDate(newDate)
    }

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return "-"
        return new Date(dateStr).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        })
    }

    const getUserDisplayName = (user: AttendanceUser) => {
        if (user.firstName && user.lastName) {
            return `${user.firstName} ${user.lastName}`
        }
        return user.name || user.email
    }

    const getUserInitials = (user: AttendanceUser) => {
        if (user.firstName && user.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`
        }
        if (user.name) {
            return user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
        }
        return user.email[0]?.toUpperCase() || "U"
    }

    const getDeviceStatusBadge = (status: string | null) => {
        if (!status) {
            return <Badge variant="outline" className="text-gray-500">Aucun appareil</Badge>
        }
        switch (status) {
            case "APPROVED":
                return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>
            case "PENDING":
                return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
            case "REVOKED":
                return <Badge className="bg-red-100 text-red-800">Révoqué</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    // Map des stats par userId pour accès rapide
    const userStatsMap = useMemo(() => {
        const map = new Map<string, { totalHours: number; daysWorked: number; avgHoursPerDay: number }>()
        if (stats?.userStats) {
            stats.userStats.forEach((stat) => {
                map.set(stat.user.id, {
                    totalHours: stat.totalHours,
                    daysWorked: stat.daysWorked,
                    avgHoursPerDay: stat.avgHoursPerDay,
                })
            })
        }
        return map
    }, [stats])

    const getHoursColor = (hours: number, expected: number = 8) => {
        const ratio = hours / expected
        if (ratio >= 1) return "text-green-600"
        if (ratio >= 0.75) return "text-yellow-600"
        return "text-red-600"
    }

    const filteredUsers = users.filter(
        (user) =>
            getUserDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Reset page when search changes
    const handleSearchChange = (value: string) => {
        setSearchTerm(value)
        setCurrentPage(1)
    }

    // Statistiques rapides
    const presentToday = users.filter((u) => u.checkIn).length
    const absentToday = users.filter((u) => !u.checkIn).length
    const withDevice = users.filter((u) => u.hasDevice).length
    const pendingDevices = users.filter((u) => u.deviceStatus === "PENDING").length

    // Calcul des heures moyennes aujourd'hui
    const avgHoursToday = users.length > 0
        ? Math.round((users.reduce((sum, u) => sum + u.hoursWorked, 0) / users.filter(u => u.hoursWorked > 0).length || 0) * 10) / 10
        : 0

    const createTerminal = async () => {
        if (!newTerminalName.trim()) {
            toast.error("Le nom du terminal est requis")
            return
        }
        try {
            const response = await fetch("/api/attendance/terminals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newTerminalName,
                    location: newTerminalLocation || null,
                }),
            })
            if (response.ok) {
                toast.success("Terminal créé avec succès")
                setShowTerminalDialog(false)
                setNewTerminalName("")
                setNewTerminalLocation("")
                mutateTerminals()
            } else {
                const error = await response.json()
                toast.error(error.error || "Erreur lors de la création")
            }
        } catch (error) {
            toast.error("Erreur lors de la création du terminal")
        }
    }

    const toggleTerminalStatus = async (terminalId: string, currentStatus: string) => {
        const action = currentStatus === "ACTIVE" ? "deactivate" : "activate"
        try {
            const response = await fetch("/api/attendance/terminals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ terminalId, action }),
            })
            if (response.ok) {
                toast.success(action === "activate" ? "Terminal activé" : "Terminal désactivé")
                mutateTerminals()
            }
        } catch (error) {
            toast.error("Erreur lors de la mise à jour")
        }
    }

    const deleteTerminal = async (terminalId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce terminal ?")) return
        try {
            const response = await fetch(`/api/attendance/terminals?id=${terminalId}`, {
                method: "DELETE",
            })
            if (response.ok) {
                toast.success("Terminal supprimé")
                mutateTerminals()
            }
        } catch (error) {
            toast.error("Erreur lors de la suppression")
        }
    }

    const copyTerminalCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setSelectedTerminalCode(code)
        toast.success("Code copié dans le presse-papier")
        setTimeout(() => setSelectedTerminalCode(null), 2000)
    }

    const getTerminalStatusBadge = (status: string) => {
        switch (status) {
            case "ACTIVE":
                return <Badge className="bg-green-100 text-green-800">Actif</Badge>
            case "INACTIVE":
                return <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>
            case "MAINTENANCE":
                return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    // Fonctions pour ouvrir les modals
    const openEmployeeHistory = (user: AttendanceUser) => {
        setSelectedEmployeeId(user.id)
        setSelectedEmployeeName(getUserDisplayName(user))
        setShowHistorySheet(true)
    }

    const openManualEntry = (userId: string | null = null, userName: string = "", date: string | null = null, checkIn: string | null = null, checkOut: string | null = null) => {
        setManualEntryUserId(userId)
        setManualEntryUserName(userName)
        setManualEntryDate(date)
        setManualEntryCheckIn(checkIn)
        setManualEntryCheckOut(checkOut)
        setShowManualEntryDialog(true)
    }

    const handleEditDay = (userId: string, date: string, checkIn: string | null, checkOut: string | null) => {
        const user = users.find(u => u.id === userId)
        openManualEntry(userId, user ? getUserDisplayName(user) : "", date, checkIn, checkOut)
    }

    // Tabs Material Design
    const tabs = [
        { id: "daily", label: "Pointages", icon: Calendar },
        { id: "devices", label: "Appareils", icon: Smartphone },
        { id: "terminals", label: "Terminaux", icon: Monitor },
    ]

    return (
        <PermissionGuard permission="attendance.view" fallback={<div>Accès non autorisé</div>}>

            <div className="flex h-screen">
                {/* Sidebar Stats - Fixed */}
                <aside className="w-72 bg-white border-r border-gray-200 p-6 fixed top-0 left-0 h-screen overflow-y-auto z-10">
                    {/* Date du jour */}
                    <div className="mb-8">
                        <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">Aujourd'hui</p>
                        <p className="text-2xl font-bold capitalize text-gray-900">
                            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                    </div>

                    {/* Stats principales */}
                    <div className="space-y-4 mb-8">
                        {/* Présents */}
                        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/30">
                            <div className="flex items-center justify-between mb-2">
                                <UserCheck className="h-5 w-5 text-emerald-600" />
                                <span className="text-3xl font-bold text-emerald-600">{presentToday}</span>
                            </div>
                            <p className="text-sm text-gray-600">Présents</p>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${users.length > 0 ? (presentToday / users.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Absents */}
                        <div className="bg-gradient-to-r from-red-500/20 to-red-600/10 rounded-xl p-4 border border-red-500/30">
                            <div className="flex items-center justify-between mb-2">
                                <UserX className="h-5 w-5 text-red-600" />
                                <span className="text-3xl font-bold text-red-600">{absentToday}</span>
                            </div>
                            <p className="text-sm text-gray-600">Absents</p>
                        </div>

                        {/* Heures moyennes */}
                        <div className="bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/30">
                            <div className="flex items-center justify-between mb-2">
                                <Timer className="h-5 w-5 text-cyan-600" />
                                <span className="text-3xl font-bold text-cyan-600">{avgHoursToday}h</span>
                            </div>
                            <p className="text-sm text-gray-600">Moyenne heures</p>
                        </div>
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-gray-200 my-6" />

                    {/* Stats Appareils */}
                    <div className="mb-8">
                        <p className="text-gray-500 text-sm uppercase tracking-wider mb-4">Appareils</p>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span className="text-sm text-gray-600">Enregistrés</span>
                                </div>
                                <span className="font-semibold">{withDevice}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                    <span className="text-sm text-gray-600">En attente</span>
                                </div>
                                <span className="font-semibold text-yellow-600">{pendingDevices}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                                    <span className="text-sm text-gray-600">Sans appareil</span>
                                </div>
                                <span className="font-semibold">{users.length - withDevice}</span>
                            </div>
                        </div>
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-gray-200 my-6" />

                    {/* Stats Période */}
                    <div>
                        <p className="text-gray-500 text-sm uppercase tracking-wider mb-4">Cette semaine</p>
                        <div className="flex gap-2 mb-4">
                            <Button
                                size="sm"
                                variant={statsPeriod === "week" ? "default" : "ghost"}
                                onClick={() => setStatsPeriod("week")}
                                className={cn(
                                    "flex-1 text-xs",
                                    statsPeriod === "week"
                                        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                Semaine
                            </Button>
                            <Button
                                size="sm"
                                variant={statsPeriod === "month" ? "default" : "ghost"}
                                onClick={() => setStatsPeriod("month")}
                                className={cn(
                                    "flex-1 text-xs",
                                    statsPeriod === "month"
                                        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                Mois
                            </Button>
                        </div>

                        {stats && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Heures attendues</p>
                                    <p className="text-xl font-bold text-gray-900">{stats.expectedTotalHours}h</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Moyenne équipe</p>
                                    <p className="text-xl font-bold text-cyan-600">{stats.avgHoursAll}h</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Taux de présence</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xl font-bold text-emerald-600">
                                            {stats.expectedTotalHours > 0
                                                ? Math.round((stats.avgHoursAll / stats.expectedTotalHours) * 100)
                                                : 0}%
                                        </p>
                                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex-1 bg-gray-50 ml-72">
                    {/* Main Content */}
                    <ModuleNavbar
                        title="Pointage"
                        description="Gestion des présences et horaires"
                        icon={Clock}
                    />
                    {/* Tabs Material Design - Sticky */}
                    <div className="bg-white shadow-sm border-b sticky top-0 z-20">
                        <div className="flex">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative",
                                        activeTab === tab.id
                                            ? "text-cyan-600"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                    {/* Indicateur Material Design */}
                                    {activeTab === tab.id && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600 rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white shadow-sm p-6">
                        {/* Tab: Pointages du jour */}
                        {activeTab === "daily" && (
                            <div className="space-y-4">
                                {/* Header avec navigation date */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="h-8 w-8">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="text-center min-w-[180px]">
                                            <p className="font-semibold capitalize text-sm">{formatDate(selectedDate)}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="h-8 w-8">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedDate(new Date())}
                                            className="ml-2 text-xs"
                                        >
                                            Aujourd'hui
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Rechercher..."
                                                value={searchTerm}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                className="pl-9 w-[200px] h-9 text-sm"
                                            />
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => openManualEntry()}
                                            className="h-9 text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                                        >
                                            <Edit3 className="h-4 w-4 mr-2" />
                                            Saisie manuelle
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => mutateUsers()} className="h-9 w-9">
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Table */}
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/50">
                                                <TableHead className="font-semibold">Employé</TableHead>
                                                <TableHead className="font-semibold">Matricule</TableHead>
                                                <TableHead className="text-center font-semibold">Arrivée</TableHead>
                                                <TableHead className="text-center font-semibold">Départ</TableHead>
                                                <TableHead className="text-center font-semibold">Heures</TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    <span className="text-xs">Moy/J</span>
                                                    <span className="block text-[10px] text-gray-400 font-normal">({statsPeriod === "week" ? "sem." : "mois"})</span>
                                                </TableHead>
                                                <TableHead className="font-semibold">Appareil</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedUsers.map((user) => (
                                                <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarFallback className={cn(
                                                                    "text-sm font-medium",
                                                                    user.checkIn ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                                                                )}>
                                                                    {getUserInitials(user)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <button
                                                                    onClick={() => openEmployeeHistory(user)}
                                                                    className="font-medium text-sm text-left hover:text-cyan-600 hover:underline transition-colors flex items-center gap-1 group"
                                                                >
                                                                    {getUserDisplayName(user)}
                                                                    <History className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </button>
                                                                <p className="text-xs text-gray-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                            {user.matricule || "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {user.checkIn ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                {formatTime(user.checkIn)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {user.checkOut ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                {formatTime(user.checkOut)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={cn(
                                                            "font-bold text-sm",
                                                            getHoursColor(user.hoursWorked)
                                                        )}>
                                                            {user.hoursWorked > 0 ? `${user.hoursWorked}h` : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {userStatsMap.get(user.id) ? (
                                                            <span className={cn(
                                                                "text-sm font-medium",
                                                                userStatsMap.get(user.id)!.avgHoursPerDay >= 8 ? "text-green-600" : 
                                                                userStatsMap.get(user.id)!.avgHoursPerDay >= 6 ? "text-yellow-600" : "text-orange-600"
                                                            )}>
                                                                {userStatsMap.get(user.id)!.avgHoursPerDay}h
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getDeviceStatusBadge(user.deviceStatus)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openEmployeeHistory(user)}>
                                                                    <History className="h-4 w-4 mr-2" />
                                                                    Voir l'historique
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    onClick={() => openManualEntry(
                                                                        user.id, 
                                                                        getUserDisplayName(user), 
                                                                        dateStr,
                                                                        user.checkIn ? formatTime(user.checkIn) : null,
                                                                        user.checkOut ? formatTime(user.checkOut) : null
                                                                    )}
                                                                >
                                                                    <Edit3 className="h-4 w-4 mr-2" />
                                                                    Modifier les heures
                                                                </DropdownMenuItem>
                                                                {(!user.hasDevice || user.deviceStatus === "REVOKED") && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => generateRegistrationLink(user.id)}
                                                                        disabled={generatingLink}
                                                                    >
                                                                        <Link2 className="h-4 w-4 mr-2" />
                                                                        Générer lien d'enregistrement
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {user.deviceStatus === "PENDING" && user.attendanceDevices[0] && (
                                                                    <DropdownMenuItem onClick={() => approveDevice(user.attendanceDevices[0].id)}>
                                                                        <Check className="h-4 w-4 mr-2" />
                                                                        Approuver l'appareil
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {user.deviceStatus === "APPROVED" && user.attendanceDevices[0] && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => revokeDevice(user.attendanceDevices[0].id)}
                                                                        className="text-red-600"
                                                                    >
                                                                        <X className="h-4 w-4 mr-2" />
                                                                        Révoquer l'appareil
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {paginatedUsers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                                                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                                        <p>Aucun utilisateur trouvé</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <p className="text-sm text-gray-500">
                                            Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} sur {filteredUsers.length} employés
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Précédent
                                            </Button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum: number
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i
                                                    } else {
                                                        pageNum = currentPage - 2 + i
                                                    }
                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            variant={currentPage === pageNum ? "default" : "outline"}
                                                            size="sm"
                                                            className={cn(
                                                                "w-8 h-8 p-0",
                                                                currentPage === pageNum && "bg-cyan-600 hover:bg-cyan-700"
                                                            )}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Suivant
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab: Appareils */}
                        {activeTab === "devices" && (
                            <div className="space-y-6">
                                {/* Appareils enregistrés */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        Appareils enregistrés
                                    </h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/50">
                                                <TableHead className="font-semibold">Employé</TableHead>
                                                <TableHead className="font-semibold">Appareil</TableHead>
                                                <TableHead className="font-semibold">Plateforme</TableHead>
                                                <TableHead className="font-semibold">Statut</TableHead>
                                                <TableHead className="font-semibold">Dernière activité</TableHead>
                                                <TableHead className="w-[100px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users
                                                .filter((u) => u.hasDevice)
                                                .map((user) => (
                                                    <TableRow key={user.id} className="hover:bg-gray-50/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs">
                                                                        {getUserInitials(user)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium text-sm">{getUserDisplayName(user)}</p>
                                                                    <p className="text-xs text-gray-500">{user.matricule || "-"}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm">
                                                                {user.attendanceDevices[0]?.deviceName || "Appareil inconnu"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize text-xs">
                                                                {user.attendanceDevices[0]?.platform || "-"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getDeviceStatusBadge(user.deviceStatus)}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-gray-500">
                                                            {user.attendanceDevices[0]?.lastSeenAt
                                                                ? new Date(user.attendanceDevices[0].lastSeenAt).toLocaleString("fr-FR")
                                                                : "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                {user.deviceStatus === "PENDING" && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => approveDevice(user.attendanceDevices[0].id)}
                                                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {user.deviceStatus === "APPROVED" && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => revokeDevice(user.attendanceDevices[0].id)}
                                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {user.deviceStatus === "REVOKED" && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => generateRegistrationLink(user.id)}
                                                                        disabled={generatingLink && selectedUserId === user.id}
                                                                        className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                        title="Générer lien d'enregistrement"
                                                                    >
                                                                        <Link2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            {users.filter((u) => u.hasDevice).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                        Aucun appareil enregistré
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Utilisateurs sans appareil */}
                                <div className="border-t pt-6">
                                    <h3 className="text-sm font-semibold text-yellow-700 mb-4 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Utilisateurs sans appareil ({users.filter((u) => !u.hasDevice).length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {users
                                            .filter((u) => !u.hasDevice)
                                            .map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                                                {getUserInitials(user)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-sm">{getUserDisplayName(user)}</p>
                                                            <p className="text-xs text-gray-500">{user.matricule || user.email}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => generateRegistrationLink(user.id)}
                                                        disabled={generatingLink && selectedUserId === user.id}
                                                        className="text-xs"
                                                    >
                                                        <Link2 className="h-3 w-3 mr-1" />
                                                        Lien
                                                    </Button>
                                                </div>
                                            ))}
                                        {users.filter((u) => !u.hasDevice).length === 0 && (
                                            <p className="text-gray-500 col-span-full text-center py-4 text-sm">
                                                Tous les utilisateurs ont un appareil enregistré ✓
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Terminaux */}
                        {activeTab === "terminals" && (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Bornes de pointage</h3>
                                        <p className="text-sm text-gray-500">Gérez les terminaux qui affichent les QR codes</p>
                                    </div>
                                    <Button onClick={() => setShowTerminalDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nouveau terminal
                                    </Button>
                                </div>

                                {/* Liste des terminaux */}
                                {terminals.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <Monitor className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                        <p className="text-gray-500 mb-4">Aucun terminal configuré</p>
                                        <Button onClick={() => setShowTerminalDialog(true)} variant="outline">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Créer un terminal
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {terminals.map((terminal) => (
                                            <div
                                                key={terminal.id}
                                                className={cn(
                                                    "bg-white border rounded-xl p-5 transition-all hover:shadow-md",
                                                    terminal.status === "ACTIVE" ? "border-green-200" : "border-gray-200"
                                                )}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                                            terminal.status === "ACTIVE" ? "bg-green-100" : "bg-gray-100"
                                                        )}>
                                                            <Monitor className={cn(
                                                                "h-5 w-5",
                                                                terminal.status === "ACTIVE" ? "text-green-600" : "text-gray-500"
                                                            )} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{terminal.name}</h4>
                                                            {terminal.location && (
                                                                <p className="text-sm text-gray-500">{terminal.location}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {getTerminalStatusBadge(terminal.status)}
                                                </div>

                                                {/* Code du terminal */}
                                                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                                    <p className="text-xs text-gray-500 mb-1">Code du terminal</p>
                                                    <div className="flex items-center justify-between">
                                                        <code className="font-mono text-sm font-semibold text-gray-900">
                                                            {terminal.code}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => copyTerminalCode(terminal.code)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            {selectedTerminalCode === terminal.code ? (
                                                                <Check className="h-4 w-4 text-green-600" />
                                                            ) : (
                                                                <Copy className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                                    <div className="flex items-center gap-1">
                                                        <QrCode className="h-4 w-4" />
                                                        <span>{terminal._count.qrTokens} QR générés</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>{terminal._count.logs} pointages</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 pt-3 border-t">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleTerminalStatus(terminal.id, terminal.status)}
                                                        className={cn(
                                                            "flex-1",
                                                            terminal.status === "ACTIVE"
                                                                ? "text-yellow-600 hover:bg-yellow-50"
                                                                : "text-green-600 hover:bg-green-50"
                                                        )}
                                                    >
                                                        <Power className="h-4 w-4 mr-1" />
                                                        {terminal.status === "ACTIVE" ? "Désactiver" : "Activer"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => deleteTerminal(terminal.id)}
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Instructions */}
                                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-6">
                                    <h4 className="font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                                        <QrCode className="h-5 w-5" />
                                        Comment configurer une borne ?
                                    </h4>
                                    <ol className="text-sm text-cyan-800 space-y-1 list-decimal list-inside">
                                        <li>Créez un terminal et copiez son code</li>
                                        <li>Installez l'application "Borne de Pointage" sur une tablette</li>
                                        <li>Entrez le code du terminal dans l'application</li>
                                        <li>La borne affichera automatiquement les QR codes</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Dialog pour créer un terminal */}
            <Dialog open={showTerminalDialog} onOpenChange={setShowTerminalDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau terminal</DialogTitle>
                        <DialogDescription>
                            Créez un nouveau terminal pour afficher les QR codes de pointage.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Nom du terminal *
                            </label>
                            <Input
                                placeholder="Ex: Borne Entrée Principale"
                                value={newTerminalName}
                                onChange={(e) => setNewTerminalName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                                Emplacement (optionnel)
                            </label>
                            <Input
                                placeholder="Ex: Hall d'entrée, Bâtiment A"
                                value={newTerminalLocation}
                                onChange={(e) => setNewTerminalLocation(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowTerminalDialog(false)}>
                                Annuler
                            </Button>
                            <Button onClick={createTerminal} className="bg-cyan-600 hover:bg-cyan-700">
                                Créer le terminal
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog pour le lien d'enregistrement */}
            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lien d'enregistrement généré</DialogTitle>
                        <DialogDescription>
                            Partagez ce lien avec l'employé pour qu'il enregistre son appareil.
                            Le lien expire dans 24 heures.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input
                                value={registrationLink || ""}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => registrationLink && copyToClipboard(registrationLink)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                            L'employé devra scanner ce lien depuis son application mobile pour enregistrer son appareil.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sheet pour l'historique d'un employé */}
            <EmployeeHistorySheet
                isOpen={showHistorySheet}
                onClose={() => setShowHistorySheet(false)}
                userId={selectedEmployeeId}
                userName={selectedEmployeeName}
                onEditDay={handleEditDay}
            />

            {/* Dialog pour la saisie manuelle */}
            <ManualEntryDialog
                isOpen={showManualEntryDialog}
                onClose={() => setShowManualEntryDialog(false)}
                userId={manualEntryUserId}
                userName={manualEntryUserName}
                date={manualEntryDate}
                initialCheckIn={manualEntryCheckIn}
                initialCheckOut={manualEntryCheckOut}
                users={users.map(u => ({
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    name: u.name,
                    email: u.email,
                }))}
                onSuccess={() => mutateUsers()}
            />
        </PermissionGuard>
    )
}
