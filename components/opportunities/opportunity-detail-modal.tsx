"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Opportunity } from "@/types/opportunities"
import {
  X,
  Plus,
  CheckSquare,
  FileText,
  Upload,
  Calendar,
  User,
  Mail,
  Building,
  Euro,
  Edit,
  Trash2,
  Download,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

interface OpportunityDetailModalProps {
  opportunity: Opportunity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

interface Task {
  id: string
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "DONE"
  userId: string
  startDate: string | null
  dueDate: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface Invoice {
  id: string
  number: string
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE"
  total: number
  dueDate: string
  createdAt: string
}

interface Document {
  id: string
  name: string
  url: string
  uploadedAt: string
}

const statusConfig = {
  NEW: { label: "Nouvelle", color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
  IN_PROGRESS: { label: "En cours", color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50" },
  WON: { label: "Gagnée", color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
  LOST: { label: "Perdue", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
}

const taskStatusConfig = {
  TODO: { label: "À faire", color: "bg-gray-500", textColor: "text-gray-700" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-500", textColor: "text-blue-700" },
  DONE: { label: "Terminé", color: "bg-green-500", textColor: "text-green-700" },
}

const invoiceStatusConfig = {
  DRAFT: { label: "Brouillon", color: "bg-gray-500", textColor: "text-gray-700" },
  SENT: { label: "Envoyée", color: "bg-blue-500", textColor: "text-blue-700" },
  PAID: { label: "Payée", color: "bg-green-500", textColor: "text-green-700" },
  OVERDUE: { label: "En retard", color: "bg-red-500", textColor: "text-red-700" },
}

export function OpportunityDetailModal({ opportunity, open, onOpenChange, onRefresh }: OpportunityDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [tasks, setTasks] = useState<Task[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // États pour les formulaires
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    userId: "",
    dueDate: "",
  })
  const [newInvoice, setNewInvoice] = useState({
    total: "",
    dueDate: "",
  })

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  }

  // Charger les données liées à l'opportunité
  useEffect(() => {
    if (open && opportunity) {
      fetchRelatedData()
      fetchUsers()
    }
  }, [open, opportunity])

  const fetchRelatedData = async () => {
    if (!opportunity) return
    
    setLoading(true)
    try {
      // Charger les tâches, factures et documents
      const [tasksRes, invoicesRes, documentsRes] = await Promise.all([
        fetch(`/api/opportunities/${opportunity.id}/tasks`),
        fetch(`/api/opportunities/${opportunity.id}/invoices`),
        fetch(`/api/opportunities/${opportunity.id}/documents`),
      ])

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData.tasks || [])
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.invoices || [])
      }

      if (documentsRes.ok) {
        const documentsData = await documentsRes.json()
        setDocuments(documentsData.documents || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error)
    }
  }

  const handleCreateTask = async () => {
    if (!opportunity || !newTask.title.trim()) return

    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: null,
          userId: opportunity.ownerId, // Utiliser le propriétaire de l'opportunité par défaut
          dueDate: null,
        }),
      })

      if (response.ok) {
        setNewTask({ title: "", description: "", userId: "", dueDate: "" })
        fetchRelatedData()
      }
    } catch (error) {
      console.error("Erreur lors de la création de la tâche:", error)
    }
  }

  const handleCreateInvoice = async () => {
    if (!opportunity || !newInvoice.total || !newInvoice.dueDate) return

    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: parseFloat(newInvoice.total),
          dueDate: new Date(newInvoice.dueDate).toISOString(),
          contactId: opportunity.contactId,
        }),
      })

      if (response.ok) {
        setNewInvoice({ total: "", dueDate: "" })
        fetchRelatedData()
      }
    } catch (error) {
      console.error("Erreur lors de la création de la facture:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!opportunity || !event.target.files?.[0]) return

    const file = event.target.files[0]
    const formData = new FormData()
    formData.append("file", file)
    formData.append("opportunityId", opportunity.id)

    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}/documents`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        fetchRelatedData()
      }
    } catch (error) {
      console.error("Erreur lors de l'upload du document:", error)
    }
  }

  if (!opportunity) return null

  const config = statusConfig[opportunity.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold mb-2">{opportunity.title}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{opportunity.contact.firstName} {opportunity.contact.lastName}</span>
                </div>
                {opportunity.contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{opportunity.contact.email}</span>
                  </div>
                )}
                <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
                  {config.label}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="tasks">
              Tâches ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              Factures ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Informations générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {opportunity.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    {opportunity.globalAmount && (
                      <div>
                        <Label className="text-sm font-medium">Montant global</Label>
                        <p className="text-lg font-semibold text-green-600">
                          {formatAmount(opportunity.globalAmount)}
                        </p>
                      </div>
                    )}
                    {opportunity.finalAmount && (
                      <div>
                        <Label className="text-sm font-medium">Montant final négocié</Label>
                        <p className="text-lg font-semibold text-green-600">
                          {formatAmount(opportunity.finalAmount)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Créée le</Label>
                      <p className="text-sm text-gray-600">{formatDate(opportunity.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Modifiée le</Label>
                      <p className="text-sm text-gray-600">{formatDate(opportunity.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Équipe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Équipe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm">
                          {getInitials(opportunity.owner.firstName, opportunity.owner.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {opportunity.owner.firstName} {opportunity.owner.lastName}
                        </p>
                        <p className="text-xs text-gray-500">Propriétaire</p>
                      </div>
                    </div>
                    
                    {opportunity.participants.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Participants</Label>
                          {opportunity.participants.map((participant) => (
                            <div key={participant.id} className="flex items-center gap-3">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(participant.user.firstName, participant.user.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {participant.user.firstName} {participant.user.lastName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6">
              {/* Formulaire simple de création de tâche */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ajouter une nouvelle tâche..."
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTask.title.trim()) {
                      handleCreateTask()
                    }
                  }}
                />
                <Button 
                  onClick={handleCreateTask}
                  disabled={!newTask.title.trim()}
                  size="sm"
                  className="px-3 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Liste des tâches */}
              <div className="space-y-2">
                {tasks.map((task) => {
                  const taskConfig = taskStatusConfig[task.status]
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.title}</span>
                          <Badge className={`${taskConfig.color} text-white text-xs`}>
                            {taskConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{task.user.firstName} {task.user.lastName}</span>
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(task.dueDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune tâche pour cette opportunité</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              {/* Formulaire de création de facture */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Nouvelle facture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoice-total">Montant total *</Label>
                      <Input
                        id="invoice-total"
                        type="number"
                        step="0.01"
                        value={newInvoice.total}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, total: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice-due-date">Date d'échéance *</Label>
                      <Input
                        id="invoice-due-date"
                        type="date"
                        value={newInvoice.dueDate}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleCreateInvoice}
                    disabled={!newInvoice.total || !newInvoice.dueDate}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer la facture
                  </Button>
                </CardContent>
              </Card>

              {/* Liste des factures */}
              <div className="space-y-3">
                {invoices.map((invoice) => {
                  const invoiceConfig = invoiceStatusConfig[invoice.status]
                  return (
                    <Card key={invoice.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">Facture #{invoice.number}</h4>
                              <Badge className={`${invoiceConfig.color} text-white text-xs`}>
                                {invoiceConfig.label}
                              </Badge>
                            </div>
                            <p className="text-lg font-semibold text-green-600">
                              {formatAmount(invoice.total)}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Échéance: {formatDate(invoice.dueDate)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                
                {invoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune facture pour cette opportunité</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              {/* Upload de document */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Importer un document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-sm text-blue-600 hover:text-blue-500">
                        Cliquez pour sélectionner un fichier
                      </span>
                      <Input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-2">
                      PDF, DOC, XLS, JPG, PNG (max 10MB)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des documents */}
              <div className="space-y-3">
                {documents.map((document) => (
                  <Card key={document.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-500" />
                          <div>
                            <h4 className="font-medium">{document.name}</h4>
                            <p className="text-xs text-gray-500">
                              Importé le {formatDate(document.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {documents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun document pour cette opportunité</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
