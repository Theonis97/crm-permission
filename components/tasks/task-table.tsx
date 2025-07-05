"use client"

import type React from "react"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Task, TaskStatus } from "@/types/tasks"
import {
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Building2,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  ArrowUpDown,
} from "lucide-react"
import { format, isAfter, isBefore, isToday } from "date-fns"
import { fr } from "date-fns/locale"

interface TaskTableProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => void
}

const statusConfig = {
  [TaskStatus.TODO]: {
    label: "À faire",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: Circle,
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "En cours",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: PlayCircle,
  },
  [TaskStatus.COMPLETED]: {
    label: "Terminé",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  [TaskStatus.CANCELLED]: {
    label: "Annulé",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
}

type SortField = "title" | "status" | "user" | "dueDate" | "createdAt"
type SortDirection = "asc" | "desc"

export function TaskTable({ tasks, onEdit, onDelete, onStatusChange }: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case "title":
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case "status":
        aValue = a.status
        bValue = b.status
        break
      case "user":
        aValue = a.user?.name?.toLowerCase() || ""
        bValue = b.user?.name?.toLowerCase() || ""
        break
      case "dueDate":
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
        break
      case "createdAt":
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await onStatusChange(task, newStatus)
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  )

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">Statut</TableHead>
            <TableHead>
              <SortButton field="title">Titre</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="user">Assigné à</SortButton>
            </TableHead>
            <TableHead>Opportunité</TableHead>
            <TableHead>
              <SortButton field="dueDate">Échéance</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="createdAt">Créé le</SortButton>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const statusInfo = statusConfig[task.status]
            const StatusIcon = statusInfo.icon

            const isOverdue =
              task.dueDate && isBefore(new Date(task.dueDate), new Date()) && task.status !== TaskStatus.COMPLETED
            const isDueToday = task.dueDate && isToday(new Date(task.dueDate))
            const isDueSoon =
              task.dueDate &&
              isAfter(new Date(task.dueDate), new Date()) &&
              isBefore(new Date(task.dueDate), new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))

            return (
              <TableRow
                key={task.id}
                className={`hover:bg-gray-50 ${
                  isOverdue ? "bg-red-50/30" : isDueToday ? "bg-orange-50/30" : isDueSoon ? "bg-yellow-50/30" : ""
                }`}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      className={`h-4 w-4 ${
                        task.status === TaskStatus.COMPLETED
                          ? "text-green-600"
                          : task.status === TaskStatus.IN_PROGRESS
                            ? "text-blue-600"
                            : task.status === TaskStatus.CANCELLED
                              ? "text-red-600"
                              : "text-gray-400"
                      }`}
                    />
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900 line-clamp-1">{task.title}</div>
                    {task.description && <div className="text-sm text-gray-600 line-clamp-1">{task.description}</div>}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          En retard
                        </Badge>
                      )}
                      {isDueToday && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                          Aujourd'hui
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-sm">{task.user?.name}</span>
                  </div>
                </TableCell>

                <TableCell>
                  {task.opportunity ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span className="text-sm truncate">{task.opportunity.title}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell>
                  {task.dueDate ? (
                    <div
                      className={`text-sm ${
                        isOverdue
                          ? "text-red-600 font-medium"
                          : isDueToday
                            ? "text-orange-600 font-medium"
                            : isDueSoon
                              ? "text-yellow-600"
                              : "text-gray-600"
                      }`}
                    >
                      {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: fr })}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell>
                  <span className="text-sm text-gray-600">
                    {format(new Date(task.createdAt), "dd/MM/yyyy", { locale: fr })}
                  </span>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(task, TaskStatus.TODO)}>
                        <Circle className="h-4 w-4 mr-2" />À faire
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(task, TaskStatus.IN_PROGRESS)}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        En cours
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(task, TaskStatus.COMPLETED)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Terminé
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600 focus:text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {sortedTasks.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">Aucune tâche trouvée</p>
        </div>
      )}
    </div>
  )
}
