"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface ModuleNavbarProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: React.ComponentType<{ className?: string }>
  }
  children?: React.ReactNode
  secondaryActions?: React.ReactNode
}

export function ModuleNavbar({ title, description, icon: Icon, primaryAction, children, secondaryActions }: ModuleNavbarProps) {
  const router = useRouter()

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto px-24 sm:px-6 lg:px-16">
        <div className="flex items-center justify-between h-16">
          {/* Section gauche - Titre et description */}
          <div className="flex items-center space-x-4">
            {/* Bouton retour */}
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-gray-300" />

            {/* Icône et titre du module */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-950 rounded-lg flex items-center justify-center">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
            </div>
          </div>

          {/* Section centre - Actions personnalisées */}
          <div className="flex-1 flex justify-center">{children}</div>

          {/* Section droite - Actions */}
          <div className="flex items-center gap-3">
            {/* Actions secondaires */}
            {secondaryActions && secondaryActions}

            {/* Bouton d'action principal */}
            {primaryAction && (
              <Button onClick={primaryAction.onClick} size="sm" className="rounded-full">
                {primaryAction.icon && <primaryAction.icon className="mr-2 h-4 w-4" />}
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
