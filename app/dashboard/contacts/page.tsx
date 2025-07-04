"use client"

import { PermissionGuard } from "@/components/auth/permission-guard"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Contact, UserPlus } from "lucide-react"

export default function ContactsPage() {
  const handleCreateContact = () => {
    console.log("Créer un nouveau contact")
  }

  return (
    <PermissionGuard permission="contacts.view">
      <div className="min-h-screen bg-gray-50">
        <ModuleNavbar
          title="Contacts"
          description="Base de données clients"
          icon={Contact}
          primaryAction={{
            label: "Nouveau contact",
            onClick: handleCreateContact,
            icon: UserPlus,
          }}
        />

        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle>Module Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Ce module sera développé pour gérer la base de données des contacts clients.
                </p>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">🚧 Module en cours de développement</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </PermissionGuard>
  )
}
