"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskFiltersComponent } from "@/components/tasks/task-filters"
import { TaskCard } from "@/components/tasks/task-card"
import { CreateTaskSheet } from "@/components/tasks/create-task-sheet"
import { EditTaskSheet } from "@/components/tasks/edit-task-sheet"
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog"
import type { Task, TaskFilters as TaskFiltersType, TaskStats, TaskStatus } from "@/types/tasks"
import { CheckSquare, Plus, Loader2, AlertCircle } from "lucide-react"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [opportunities, setOpportunities] = useState<Array<{ id: string; title: string }>>([])
  const [filters, setFilters] = useState<TaskFiltersType>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams()

      if (filters.status?.length) {
        params.set("status", filters.status.join(","))
      }
      if (filters.userId?.length) {
        params.set("userId", filters.userId.join(","))
      }
      if (filters.opportunityId) {
        params.set("opportunityId", filters.opportunityId)
      }
      if (filters.search) {
        params.set("search", filters.search)
      }

      const response = await fetch(`/api/tasks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des tâches:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/tasks/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error)
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

  const fetchOpportunities = async () => {
    try {
      // Assuming we have an opportunities API
      const response = await fetch("/api/opportunities")
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.opportunities || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des opportunités:", error)
      setOpportunities([]) // Set empty array if API doesn't exist yet
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchTasks(), fetchStats(), fetchUsers(), fetchOpportunities()])
      setIsLoading(false)
    }

    loadData()
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [filters])

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: newStatus }),
      })

      if (response.ok) {
        await fetchTasks()
        await fetchStats()
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
    }
  }

  const handleTaskCreated = async () => {
    await fetchTasks()
    await fetchStats()
  }

  const handleTaskUpdated = async () => {
    await fetchTasks()
    await fetchStats()
  }

  const handleTaskDeleted = async () => {
    await fetchTasks()
    await fetchStats()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des tâches...</span>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="tasks.view">
      <div className="min-h-screen bg-gray-50">
        <ModuleNavbar
          title="Tâches"
          description="Gestion des activités et tâches"
          icon={CheckSquare}
          primaryAction={{
            label: "Nouvelle tâche",
            onClick: () => setIsCreateOpen(true),
            icon: Plus,
          }}
        />

        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Statistiques */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                      <CheckSquare className="h-8 w-8 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">À faire</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.todo}</p>
                      </div>
                      <Badge variant="outline" className="bg-gray-100">
                        {stats.todo}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">En cours</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.inProgress}</p>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {stats.inProgress}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Terminé</p>
                        <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {stats.completed}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">En retard</p>
                        <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filtres */}
            <div className="mb-6">
              <TaskFiltersComponent filters={filters} onFiltersChange={setFilters} users={users} opportunities={opportunities} />
            </div>

            {/* Liste des tâches */}
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tâche trouvée</h3>
                  <p className="text-gray-600 mb-4">Commencez par créer votre première tâche.</p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle tâche
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={setEditingTask}
                    onDelete={setDeletingTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Modales */}
        <CreateTaskSheet
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onTaskCreated={handleTaskCreated}
          users={users}
          opportunities={opportunities}
        />

        <EditTaskSheet
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onTaskUpdated={handleTaskUpdated}
          users={users}
          opportunities={opportunities}
        />

        <DeleteTaskDialog
          task={deletingTask}
          open={!!deletingTask}
          onOpenChange={(open) => !open && setDeletingTask(null)}
          onTaskDeleted={handleTaskDeleted}
        />
      </div>
    </PermissionGuard>
  )
}
