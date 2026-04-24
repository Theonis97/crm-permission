"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Sun, 
  Star, 
  Calendar, 
  CheckSquare, 
  Plus, 
  Search,
  MoreHorizontal,
  ChevronRight,
  User,
  Sparkles,
  Edit
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/app-toast"
import { CreateTaskSheet } from "@/components/tasks/create-task-sheet"
import { EditTaskSheet } from "@/components/tasks/edit-task-sheet"
import { useSession } from "next-auth/react"
import { type Task, TaskStatus } from "@/types/tasks"

type TaskPriority = "low" | "medium" | "high"

interface TaskList {
  id: string
  name: string
  icon: any
  color: string
  filter: (task: Task) => boolean
  count?: number
}

export default function TasksPageV2() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedList, setSelectedList] = useState("my-day")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [opportunities, setOpportunities] = useState<Array<{ id: string; title: string }>>([])
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Listes inspirées de Microsoft To Do
  const taskLists: TaskList[] = [
    {
      id: "my-day",
      name: "Ma journée",
      icon: Sun,
      color: "text-blue-600",
      filter: (task) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const taskDate = task.dueDate ? new Date(task.dueDate) : null
        return task.status !== TaskStatus.COMPLETED && (!taskDate || taskDate <= today)
      },
    },
    {
      id: "important",
      name: "Important",
      icon: Star,
      color: "text-orange-500",
      filter: (task) => task.isImportant === true && task.status !== TaskStatus.COMPLETED,
    },
    {
      id: "planned",
      name: "Planifié",
      icon: Calendar,
      color: "text-green-600",
      filter: (task) => !!task.dueDate && task.status !== TaskStatus.COMPLETED,
    },
    {
      id: "assigned",
      name: "Qui m'est assigné",
      icon: User,
      color: "text-purple-600",
      filter: (task) => task.status !== TaskStatus.COMPLETED,
    },
    {
      id: "all",
      name: "Toutes",
      icon: CheckSquare,
      color: "text-gray-600",
      filter: () => true,
    },
    {
      id: "completed",
      name: "Terminées",
      icon: Sparkles,
      color: "text-emerald-600",
      filter: (task) => task.status === TaskStatus.COMPLETED,
    },
  ]

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Impossible de charger les tâches")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.map((u: any) => ({ id: u.id, name: u.name || u.email })))
      }
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  const fetchOpportunities = async () => {
    try {
      const response = await fetch("/api/opportunities")
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.opportunities || [])
      }
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchUsers()
    fetchOpportunities()
  }, [])

  const currentList = taskLists.find((l) => l.id === selectedList)!
  const filteredTasks = tasks
    .filter((task) => {
      // Filtre de liste
      if (!currentList.filter(task)) return false
      
      // Filtre "Qui m'est assigné"
      if (selectedList === "assigned" && task.userId !== session?.user?.id) return false
      
      // Filtre de recherche
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      
      return true
    })

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setShowEditSheet(true)
  }

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: newStatus }),
      })

      if (response.ok) {
        await fetchTasks()
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const handleToggleImportant = async (task: Task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, isImportant: !task.isImportant }),
      })

      if (response.ok) {
        await fetchTasks()
      }
    } catch (error) {
      toast.error("Erreur")
    }
  }

  return (
    <PermissionGuard permission="tasks.view">
      <div className="flex h-screen bg-white">
        {/* Sidebar */}
        <aside className="w-72 border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="h-7 w-7 text-blue-600" />
              Tâches
            </h1>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {taskLists.map((list) => {
              const Icon = list.icon
              const count = tasks.filter(list.filter).length
              
              return (
                <button
                  key={list.id}
                  onClick={() => setSelectedList(list.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors",
                    selectedList === list.id
                      ? "bg-blue-50 text-blue-900"
                      : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", list.color)} />
                    <span className="font-medium">{list.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-sm text-gray-500">{count}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                {(() => {
                  const Icon = currentList.icon
                  return <Icon className={cn("h-8 w-8", currentList.color)} />
                })()}
                <h2 className="text-3xl font-bold text-gray-900">
                  {currentList.name}
                </h2>
              </div>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une tâche..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>
          </header>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl">
              {/* Add Task */}
              <div className="mb-6">
                <Button
                  onClick={() => setShowCreateSheet(true)}
                  className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle tâche
                </Button>
              </div>

              {/* Tasks */}
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  Chargement...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune tâche pour le moment</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="flex-shrink-0"
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                            task.status === TaskStatus.COMPLETED
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 hover:border-blue-600"
                          )}
                        >
                          {task.status === TaskStatus.COMPLETED && (
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            task.status === TaskStatus.COMPLETED
                              ? "line-through text-gray-400"
                              : "text-gray-900"
                          )}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {task.description}
                          </p>
                        )}
                        {task.user && (
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {task.user.name}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Star */}
                      <button
                        onClick={() => handleToggleImportant(task)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star
                          className={cn(
                            "h-5 w-5",
                            task.isImportant
                              ? "fill-orange-400 text-orange-400"
                              : "text-gray-300 hover:text-orange-400"
                          )}
                        />
                      </button>

                      {/* Edit */}
                      <button 
                        onClick={() => handleEditTask(task)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="h-5 w-5 text-gray-400 hover:text-blue-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modals */}
        <CreateTaskSheet
          open={showCreateSheet}
          onOpenChange={setShowCreateSheet}
          onTaskCreated={fetchTasks}
          users={users}
          opportunities={opportunities}
        />

        <EditTaskSheet
          task={selectedTask}
          open={showEditSheet}
          onOpenChange={setShowEditSheet}
          onTaskUpdated={fetchTasks}
          users={users}
          opportunities={opportunities}
        />
      </div>
    </PermissionGuard>
  )
}
