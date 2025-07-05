"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
} from "lucide-react"
import { format, isAfter, isBefore, isToday } from "date-fns"
import { fr } from "date-fns/locale"

interface TaskCardProps {
  task: Task
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

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const statusInfo = statusConfig[task.status]
  const StatusIcon = statusInfo.icon

  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), new Date()) && task.status !== TaskStatus.COMPLETED

  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))
  const isDueSoon =
    task.dueDate &&
    isAfter(new Date(task.dueDate), new Date()) &&
    isBefore(new Date(task.dueDate), new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsUpdating(true)
    try {
      await onStatusChange(task, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        isOverdue
          ? "border-red-200 bg-red-50/30"
          : isDueToday
            ? "border-orange-200 bg-orange-50/30"
            : isDueSoon
              ? "border-yellow-200 bg-yellow-50/30"
              : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
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
            <Badge variant="outline" className={statusInfo.color}>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.TODO)}>
                <Circle className="h-4 w-4 mr-2" />À faire
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}>
                <PlayCircle className="h-4 w-4 mr-2" />
                En cours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.COMPLETED)}>
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
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900 line-clamp-2">{task.title}</h3>
            {task.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{task.user?.name}</span>
            </div>

            {task.opportunity && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{task.opportunity.title}</span>
              </div>
            )}
          </div>

          {(task.startDate || task.dueDate) && (
            <div className="flex items-center gap-4 text-sm">
              {task.startDate && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>Début: {format(new Date(task.startDate), "dd/MM/yyyy", { locale: fr })}</span>
                </div>
              )}

              {task.dueDate && (
                <div
                  className={`flex items-center gap-1 ${
                    isOverdue
                      ? "text-red-600"
                      : isDueToday
                        ? "text-orange-600"
                        : isDueSoon
                          ? "text-yellow-600"
                          : "text-gray-500"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  <span>Échéance: {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: fr })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
