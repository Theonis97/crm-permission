"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  Home,
  FileText,
  Folder,
  Share2,
  Star,
  Trash2,
  Image,
  Video,
  Music,
  FileIcon,
  Plus,
  ArrowLeft,
} from "lucide-react"
import { formatFileSize } from "@/lib/s3"

interface GedStats {
  storage: {
    used: number
    limit: number
    percentage: number
  }
  counts: {
    files: number
    folders: number
    images: number
    videos: number
    audio: number
    documents: number
    sharedWithMe: number
    sharedByMe: number
    trash: number
    favorites: number
  }
}

const mainMenuItems = [
  { icon: Home, label: "Mon espace", href: "/dashboard/ged", filter: "" },
  { icon: FileText, label: "Tous les fichiers", href: "/dashboard/ged?s=files", filter: "files" },
  { icon: Folder, label: "Dossiers", href: "/dashboard/ged?s=folders", filter: "folders" },
  { icon: Share2, label: "Partagés", href: "/dashboard/ged?s=shared", filter: "shared" },
  { icon: Star, label: "Favoris", href: "/dashboard/ged?s=favorites", filter: "favorites" },
  { icon: Trash2, label: "Corbeille", href: "/dashboard/ged?s=trash", filter: "trash" },
]

const typeMenuItems = [
  { icon: Image, label: "Images", href: "/dashboard/ged?s=files&type=image", filter: "image", type: "images" },
  { icon: Video, label: "Vidéos", href: "/dashboard/ged?s=files&type=video", filter: "video", type: "videos" },
  { icon: Music, label: "Audio", href: "/dashboard/ged?s=files&type=audio", filter: "audio", type: "audio" },
  { icon: FileIcon, label: "Documents", href: "/dashboard/ged?s=files&type=document", filter: "document", type: "documents" },
]

export function GedSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<GedStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const currentSection = searchParams.get("s") || ""
  const currentType = searchParams.get("type") || ""
  const currentFolderId = searchParams.get("folder") || ""

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/ged/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching GED stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const isActive = (filter: string, type?: string) => {
    // Si on est dans un dossier, aucun menu n'est actif sauf "Mon espace"
    if (currentFolderId && filter === "") return false
    if (currentFolderId) return false
    
    // Pour les filtres par type
    if (type) {
      return currentSection === "files" && currentType === type.slice(0, -1)
    }
    
    // Pour les sections principales
    if (filter === "") {
      return !currentSection && !currentFolderId
    }
    return currentSection === filter
  }

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-screen">
      {/* Bouton Retour */}
      <div className="p-4 border-b">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>
      </div>

      {/* Bouton Importer */}
      <div className="p-4">
        <Button className="w-full bg-teal-600 hover:bg-teal-700" asChild>
          <Link href="/dashboard/ged?upload=true">
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Link>
        </Button>
      </div>

      {/* Menu principal */}
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {mainMenuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.filter)
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.label === "Corbeille" && stats?.counts.trash ? (
                  <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {stats.counts.trash}
                  </span>
                ) : null}
                {item.label === "Partagés" && stats?.counts.sharedWithMe ? (
                  <span className="ml-auto text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                    {stats.counts.sharedWithMe}
                  </span>
                ) : null}
                {item.label === "Favoris" && stats?.counts.favorites ? (
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    {stats.counts.favorites}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        {/* Séparateur */}
        <div className="my-4 border-t" />

        {/* Menu par type */}
        <ul className="space-y-1">
          {typeMenuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.filter, item.type)
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {stats?.counts[item.type as keyof typeof stats.counts] ? (
                  <span className="ml-auto text-xs text-gray-500">
                    {stats.counts[item.type as keyof typeof stats.counts]}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Indicateur de stockage */}
      <div className="p-4 border-t">
        <div className="text-sm text-gray-600 mb-2">Stockage utilisé</div>
        {isLoading ? (
          <div className="h-2 bg-gray-200 rounded animate-pulse" />
        ) : stats ? (
          <>
            <Progress value={stats.storage.percentage} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {formatFileSize(stats.storage.used)} sur {formatFileSize(stats.storage.limit)}
              </span>
              <Button variant="link" size="sm" className="h-auto p-0 text-teal-600">
                Augmenter
              </Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-400">Erreur de chargement</div>
        )}
      </div>
    </aside>
  )
}
