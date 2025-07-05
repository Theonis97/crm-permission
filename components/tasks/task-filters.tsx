"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { TaskStatus, type TaskFilters } from "@/types/tasks"
import { Filter, X, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface TaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  users: Array<{ id: string; name: string }>
  opportunities: Array<{ id: string; title: string }>
}

const statusLabels = {
  [TaskStatus.TODO]: "À faire",
  [TaskStatus.IN_PROGRESS]: "En cours",
  [TaskStatus.COMPLETED]: "Terminé",
  [TaskStatus.CANCELLED]: "Annulé",
}

const statusColors = {
  [TaskStatus.TODO]: "bg-gray-100 text-gray-800",
  [TaskStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800",
  [TaskStatus.COMPLETED]: "bg-green-100 text-green-800",
  [TaskStatus.CANCELLED]: "bg-red-100 text-red-800",
}

export function TaskFiltersComponent({ filters, onFiltersChange, users, opportunities }: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateFilters = (key: keyof TaskFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <Input
          placeholder="Rechercher des tâches..."
          value={filters.search || ""}
          onChange={(e) => updateFilters("search", e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative bg-transparent">
            <Filter className="h-4 w-4 mr-2" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtres</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Effacer
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Statut</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.values(TaskStatus).map((status) => (
                    <Badge
                      key={status}
                      variant={filters.status?.includes(status) ? "default" : "outline"}
                      className={`cursor-pointer ${filters.status?.includes(status) ? "" : statusColors[status]}`}
                      onClick={() => {
                        const currentStatus = filters.status || []
                        const newStatus = currentStatus.includes(status)
                          ? currentStatus.filter((s) => s !== status)
                          : [...currentStatus, status]
                        updateFilters("status", newStatus.length > 0 ? newStatus : undefined)
                      }}
                    >
                      {statusLabels[status]}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Assigné à</Label>
                <Select
                  value={filters.userId?.[0] || "allUsers"}
                  onValueChange={(value) => updateFilters("userId", value === "allUsers" ? undefined : [value])}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Tous les utilisateurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allUsers">Tous les utilisateurs</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Opportunité</Label>
                <Select
                  value={filters.opportunityId || "allOpportunities"}
                  onValueChange={(value) =>
                    updateFilters("opportunityId", value === "allOpportunities" ? undefined : value)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Toutes les opportunités" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allOpportunities">Toutes les opportunités</SelectItem>
                    {opportunities.map((opportunity) => (
                      <SelectItem key={opportunity.id} value={opportunity.id}>
                        {opportunity.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm font-medium">Date début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-2 justify-start text-left font-normal bg-transparent"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dueDateFrom ? format(filters.dueDateFrom, "dd/MM/yyyy", { locale: fr }) : "Début"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dueDateFrom}
                        onSelect={(date) => updateFilters("dueDateFrom", date)}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-2 justify-start text-left font-normal bg-transparent"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dueDateTo ? format(filters.dueDateTo, "dd/MM/yyyy", { locale: fr }) : "Fin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dueDateTo}
                        onSelect={(date) => updateFilters("dueDateTo", date)}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
