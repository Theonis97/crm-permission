"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Contact } from "@/types/opportunities"
import { AlertCircle, CheckCircle2, Users, UserIcon, Loader2, Target, User, Mail, Building, Search, X, Plus, Phone, Euro } from "lucide-react"

interface CreateOpportunitySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface OpportunityUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function CreateOpportunitySheet({ open, onOpenChange, onSuccess }: CreateOpportunitySheetProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<OpportunityUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [contactSearchTerm, setContactSearchTerm] = useState("")
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [creatingContact, setCreatingContact] = useState(false)
  const [newContactData, setNewContactData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    globalAmount: "",
    finalAmount: "",
    contactId: "",
    participantIds: [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Charger les contacts et utilisateurs
  useEffect(() => {
    if (open) {
      setLoadingData(true)
      Promise.all([
        fetch("/api/contacts").then((res) => {
          if (res.ok) {
            return res.json()
          }
          throw new Error("Erreur lors du chargement des contacts")
        }),
        fetch("/api/users").then((res) => {
          if (res.ok) {
            return res.json()
          }
          throw new Error("Erreur lors du chargement des utilisateurs")
        }),
      ])
        .then(([contactsData, usersData]) => {
          setContacts(contactsData || [])
          setUsers(usersData.users || [])
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des données:", error)
          setErrors({ data: "Erreur lors du chargement des données" })
        })
        .finally(() => {
          setLoadingData(false)
        })
    }
  }, [open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est obligatoire"
    }

    if (!formData.contactId) {
      newErrors.contactId = "Le contact est obligatoire"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
        onOpenChange(false)
        setFormData({
          title: "",
          description: "",
          globalAmount: "",
          finalAmount: "",
          contactId: "",
          participantIds: [],
        })
        setErrors({})
      } else {
        const data = await response.json()
        setErrors({ submit: data.error || "Erreur lors de la création" })
      }
    } catch (error) {
      setErrors({ submit: "Erreur lors de la création de l'opportunité" })
    } finally {
      setLoading(false)
    }
  }

  const handleParticipantToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(userId)
        ? prev.participantIds.filter((id) => id !== userId)
        : [...prev.participantIds, userId],
    }))
  }

  // Filtrer les utilisateurs selon le terme de recherche
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
    const email = user.email.toLowerCase()
    const search = searchTerm.toLowerCase()
    return fullName.includes(search) || email.includes(search)
  })

  // Filtrer les contacts selon le terme de recherche
  const filteredContacts = contacts.filter((contact) => {
    if (!contactSearchTerm) return true
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase()
    const email = contact.email?.toLowerCase() || ""
    const search = contactSearchTerm.toLowerCase()
    return fullName.includes(search) || email.includes(search)
  })

  // Fonction pour créer un nouveau contact
  const handleCreateContact = async () => {
    if (!newContactData.firstName || !newContactData.lastName) {
      setErrors({ ...errors, newContact: "Le prénom et nom sont obligatoires" })
      return
    }

    if (!session?.user?.id) {
      setErrors({ ...errors, newContact: "Session utilisateur non trouvée" })
      return
    }

    setCreatingContact(true)
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newContactData,
          assignedUserId: session?.user?.id, // ID de l'utilisateur connecté
        }),
      })

      if (response.ok) {
        const newContact = await response.json()
        setContacts([...contacts, newContact])
        setFormData({ ...formData, contactId: newContact.id })
        setShowCreateContact(false)
        setNewContactData({ firstName: "", lastName: "", email: "", phone: "" })
        setContactSearchTerm("")
        delete errors.newContact
      } else {
        const data = await response.json()
        setErrors({ ...errors, newContact: data.error || "Erreur lors de la création du contact" })
      }
    } catch (error) {
      setErrors({ ...errors, newContact: "Erreur lors de la création du contact" })
    } finally {
      setCreatingContact(false)
    }
  }

  // Réinitialiser la recherche quand le sheet se ferme
  useEffect(() => {
    if (!open) {
      setSearchTerm("")
      setContactSearchTerm("")
      setShowCreateContact(false)
      setNewContactData({ firstName: "", lastName: "", email: "", phone: "" })
    }
  }, [open])

  // Validation des sections pour les badges
  const isBasicInfoValid = formData.title.trim() && formData.contactId
  const hasParticipants = formData.participantIds.length > 0

  if (loadingData) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto !p-0">
        <div className="p-6 h-full flex flex-col">
          <SheetHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-xl">Nouvelle opportunité</SheetTitle>
                <SheetDescription className="text-base">
                  Créez une nouvelle opportunité d'affaires pour développer votre portefeuille client
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {errors.data && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-600 font-medium">{errors.data}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          {/* Informations de base */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Target className="h-4 w-4 text-indigo-600" />
                  </div>
                  <CardTitle className="text-lg">Informations de base</CardTitle>
                </div>
                {isBasicInfoValid ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complété
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Requis
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    Titre de l'opportunité *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Refonte du site web e-commerce"
                    className={`h-11 ${errors.title ? "border-red-500 focus:border-red-500" : "focus:border-indigo-500"}`}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                    <Building className="h-3 w-3" />
                    Description détaillée
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez l'opportunité, les enjeux, les objectifs..."
                    rows={4}
                    className="resize-none focus:border-indigo-500"
                  />
                </div>

                {/* Montants */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="globalAmount" className="text-sm font-medium flex items-center gap-2">
                      <Euro className="h-3 w-3" />
                      Montant global
                    </Label>
                    <Input
                      id="globalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.globalAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, globalAmount: e.target.value }))}
                      placeholder="0.00"
                      className="h-11 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="finalAmount" className="text-sm font-medium flex items-center gap-2">
                      <Euro className="h-3 w-3" />
                      Montant final négocié
                    </Label>
                    <Input
                      id="finalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.finalAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, finalAmount: e.target.value }))}
                      placeholder="0.00"
                      className="h-11 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contactId" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Contact principal *
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateContact(true)}
                      className="h-8 px-3 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  {/* Barre de recherche de contact */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un contact..."
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                      className={`pl-10 pr-10 h-11 ${errors.contactId ? "border-red-500" : "focus:border-indigo-500"}`}
                    />
                    {contactSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setContactSearchTerm("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Liste des contacts filtrés */}
                  {contactSearchTerm && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {filteredContacts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">Aucun contact trouvé pour "{contactSearchTerm}"</p>
                        </div>
                      ) : (
                        filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              setFormData({ ...formData, contactId: contact.id })
                              setContactSearchTerm(`${contact.firstName} ${contact.lastName}`)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {contact.firstName} {contact.lastName}
                                </span>
                                {contact.email && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Contact sélectionné */}
                  {formData.contactId && !contactSearchTerm && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      {(() => {
                        const selectedContact = contacts.find(c => c.id === formData.contactId)
                        return selectedContact ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div>
                                <span className="font-medium text-sm text-indigo-900">
                                  {selectedContact.firstName} {selectedContact.lastName}
                                </span>
                                {selectedContact.email && (
                                  <p className="text-xs text-indigo-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {selectedContact.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setFormData({ ...formData, contactId: "" })}
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}

                  {errors.contactId && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.contactId}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Participants */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Équipe projet</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Sélectionnez les collaborateurs qui travailleront sur cette opportunité
                    </p>
                  </div>
                </div>
                {hasParticipants && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    <Users className="h-3 w-3 mr-1" />
                    {formData.participantIds.length} membre{formData.participantIds.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Barre de recherche */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un membre de l'équipe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 h-11 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Résultats de recherche */}
              {searchTerm && (
                <div className="mb-3 text-sm text-gray-600">
                  {filteredUsers.length} résultat{filteredUsers.length > 1 ? "s" : ""} trouvé{filteredUsers.length > 1 ? "s" : ""}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {users.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucun utilisateur disponible</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucun utilisateur trouvé pour "{searchTerm}"</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-gray-50 ${
                        formData.participantIds.includes(user.id)
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200"
                      }`}
                      onClick={() => handleParticipantToggle(user.id)}
                    >
                      <Checkbox
                        id={`participant-${user.id}`}
                        checked={formData.participantIds.includes(user.id)}
                        onCheckedChange={() => handleParticipantToggle(user.id)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-600 font-medium">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Boutons de soumission */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-8 -mx-6 px-6">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={loading}
                className="w-full h-12"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !isBasicInfoValid}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Créer l'opportunité
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Modal de création de contact */}
        {showCreateContact && (
          <div className="fixed inset-0 bg-black/50 z-[2002] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="h-5 w-5 text-indigo-600" />
                    Nouveau contact
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateContact(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium">
                        Prénom *
                      </Label>
                      <Input
                        id="firstName"
                        value={newContactData.firstName}
                        onChange={(e) => setNewContactData({ ...newContactData, firstName: e.target.value })}
                        placeholder="Prénom"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium">
                        Nom *
                      </Label>
                      <Input
                        id="lastName"
                        value={newContactData.lastName}
                        onChange={(e) => setNewContactData({ ...newContactData, lastName: e.target.value })}
                        placeholder="Nom"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContactData.email}
                      onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                      placeholder="contact@exemple.com"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      value={newContactData.phone}
                      onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                      placeholder="+33 6 12 34 56 78"
                      className="h-10"
                    />
                  </div>

                  {errors.newContact && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.newContact}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateContact(false)}
                      disabled={creatingContact}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateContact}
                      disabled={creatingContact || !newContactData.firstName || !newContactData.lastName}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                    >
                      {creatingContact ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer le contact
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
