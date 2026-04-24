"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Grid3X3,
  List,
  Plus,
  Upload,
  FolderPlus,
  MoreHorizontal,
  Loader2,
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Eye,
  Download,
  Pencil,
  Share2,
  Star,
  Archive,
  Trash2,
  RefreshCw,
  ChevronRight,
  Home,
  Copy,
  FolderInput,
  RotateCcw,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
import { formatFileSize } from "@/lib/s3"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { GedUploadModal } from "@/components/ged/ged-upload-modal"
import { GedCreateFolderModal } from "@/components/ged/ged-create-folder-modal"
import { GedPreviewModal } from "@/components/ged/ged-preview-modal"
import { GedRenameModal } from "@/components/ged/ged-rename-modal"
import { GedShareModal } from "@/components/ged/ged-share-modal"
import { GedMoveModal } from "@/components/ged/ged-move-modal"

interface GedFolder {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  parentId?: string
  createdAt: string
  isDeleted?: boolean
  _count?: {
    children: number
    files: number
  }
}

interface Breadcrumb {
  id: string
  name: string
}

interface GedFile {
  id: string
  name: string
  originalName: string
  s3Key: string
  mimeType: string
  size: number
  extension: string
  folderId?: string
  createdAt: string
  folder?: { id: string; name: string }
}

type ViewMode = "grid" | "list"

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return ImageIcon
  if (mimeType.startsWith("video/")) return Video
  if (mimeType.startsWith("audio/")) return Music
  if (mimeType === "application/pdf") return FileText
  return File
}

export default function GedPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Paramètres URL
  const showUpload = searchParams.get("upload") === "true"
  const section = searchParams.get("s") || "" // files, folders, shared, favorites, trash
  const fileType = searchParams.get("type") || "" // image, video, audio, document
  const currentFolderId = searchParams.get("folder") || ""

  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [folders, setFolders] = useState<GedFolder[]>([])
  const [files, setFiles] = useState<GedFile[]>([])
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb[]>([])
  const [currentFolder, setCurrentFolder] = useState<GedFolder | null>(null)

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(showUpload)
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<GedFile | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<GedFolder | null>(null)
  const [moveMode, setMoveMode] = useState<"move" | "copy">("move")

  // Favoris
  const [favoriteIds, setFavoriteIds] = useState<{ files: string[]; folders: string[] }>({
    files: [],
    folders: [],
  })

  // Déterminer le titre de la page
  const getPageTitle = () => {
    if (currentFolderId && currentFolder) return currentFolder.name
    if (section === "files") {
      if (fileType === "image") return "Images"
      if (fileType === "video") return "Vidéos"
      if (fileType === "audio") return "Audio"
      if (fileType === "document") return "Documents"
      return "Tous les fichiers"
    }
    if (section === "folders") return "Dossiers"
    if (section === "shared") return "Partagés avec moi"
    if (section === "favorites") return "Favoris"
    if (section === "trash") return "Corbeille"
    return "Mon espace"
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Si on est dans la corbeille
      if (section === "trash") {
        const trashRes = await fetch("/api/ged/trash")
        if (trashRes.ok) {
          const trashData = await trashRes.json()
          setFolders(trashData.folders || [])
          setFiles(trashData.files || [])
        }
        setBreadcrumb([])
        setCurrentFolder(null)
        setIsLoading(false)
        return
      }

      // Si on est dans un dossier spécifique
      if (currentFolderId) {
        const folderRes = await fetch(`/api/ged/folders/${currentFolderId}`)
        if (folderRes.ok) {
          const folderData = await folderRes.json()
          setFolders(folderData.folder?.children || [])
          setFiles(folderData.folder?.files || [])
          setBreadcrumb(folderData.breadcrumb || [])
          setCurrentFolder(folderData.folder)
        } else {
          toast.error("Dossier introuvable")
          router.push("/dashboard/ged")
        }
        setIsLoading(false)
        return
      }

      // Construire les URLs de requête
      let foldersUrl = "/api/ged/folders"
      let filesUrl = "/api/ged/files?folderId=root"

      // Filtres par section
      if (section === "files") {
        foldersUrl = "" // Pas de dossiers dans la vue fichiers
        filesUrl = "/api/ged/files"
        if (fileType) {
          filesUrl += `?type=${fileType}`
        }
      } else if (section === "folders") {
        filesUrl = "" // Pas de fichiers dans la vue dossiers
      } else if (section === "shared") {
        foldersUrl = "/api/ged/folders?includeShared=true"
        filesUrl = "/api/ged/files?includeShared=true"
      }

      const requests: Promise<Response>[] = []
      if (foldersUrl) requests.push(fetch(foldersUrl))
      if (filesUrl) requests.push(fetch(filesUrl))

      const responses = await Promise.all(requests)

      let folderIndex = 0
      let fileIndex = foldersUrl ? 1 : 0

      if (foldersUrl && responses[folderIndex]?.ok) {
        const foldersData = await responses[folderIndex].json()
        setFolders(foldersData.folders || [])
      } else {
        setFolders([])
      }

      if (filesUrl && responses[fileIndex]?.ok) {
        const filesData = await responses[fileIndex].json()
        setFiles(filesData.files || [])
      } else {
        setFiles([])
      }

      setBreadcrumb([])
      setCurrentFolder(null)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setIsLoading(false)
    }
  }, [section, fileType, currentFolderId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Charger les favoris
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await fetch("/api/ged/favorites")
        if (response.ok) {
          const data = await response.json()
          const fileIds = data.favorites
            ?.filter((f: any) => f.fileId)
            .map((f: any) => f.fileId) || []
          const folderIds = data.favorites
            ?.filter((f: any) => f.folderId)
            .map((f: any) => f.folderId) || []
          setFavoriteIds({ files: fileIds, folders: folderIds })
        }
      } catch (error) {
        console.error("Error fetching favorites:", error)
      }
    }
    fetchFavorites()
  }, [])

  // Toggle favori
  const toggleFavorite = async (id: string, isFolder: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch("/api/ged/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isFolder ? { folderId: id } : { fileId: id }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isFavorite) {
          setFavoriteIds((prev) => ({
            files: isFolder ? prev.files : [...prev.files, id],
            folders: isFolder ? [...prev.folders, id] : prev.folders,
          }))
          toast.success("Ajouté aux favoris")
        } else {
          setFavoriteIds((prev) => ({
            files: isFolder ? prev.files : prev.files.filter((fid) => fid !== id),
            folders: isFolder ? prev.folders.filter((fid) => fid !== id) : prev.folders,
          }))
          toast.success("Retiré des favoris")
        }
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour des favoris")
    }
  }

  // Navigation dans un dossier
  const navigateToFolder = (folderId: string) => {
    router.push(`/dashboard/ged?folder=${folderId}`)
  }

  // Navigation vers la racine
  const navigateToRoot = () => {
    router.push("/dashboard/ged")
  }

  const handlePreview = async (file: GedFile) => {
    setSelectedFile(file)
    setPreviewModalOpen(true)
  }

  const handleDownload = async (file: GedFile) => {
    try {
      const response = await fetch(`/api/ged/files/${file.id}?action=download`)
      if (response.ok) {
        const data = await response.json()
        window.open(data.downloadUrl, "_blank")
      } else {
        toast.error("Erreur lors du téléchargement")
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement")
    }
  }

  const handleRename = (item: GedFile | GedFolder, isFolder: boolean) => {
    if (isFolder) {
      setSelectedFolder(item as GedFolder)
      setSelectedFile(null)
    } else {
      setSelectedFile(item as GedFile)
      setSelectedFolder(null)
    }
    setRenameModalOpen(true)
  }

  const handleShare = (item: GedFile | GedFolder, isFolder: boolean) => {
    if (isFolder) {
      setSelectedFolder(item as GedFolder)
      setSelectedFile(null)
    } else {
      setSelectedFile(item as GedFile)
      setSelectedFolder(null)
    }
    setShareModalOpen(true)
  }

  const handleDelete = async (item: GedFile | GedFolder, isFolder: boolean) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return

    try {
      const endpoint = isFolder
        ? `/api/ged/folders/${item.id}`
        : `/api/ged/files/${item.id}`
      const response = await fetch(endpoint, { method: "DELETE" })

      if (response.ok) {
        toast.success("Élément déplacé vers la corbeille")
        fetchData()
      } else {
        toast.error("Erreur lors de la suppression")
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    }
  }

  // Déplacer un fichier
  const handleMove = (file: GedFile) => {
    setSelectedFile(file)
    setSelectedFolder(null)
    setMoveMode("move")
    setMoveModalOpen(true)
  }

  // Copier un fichier
  const handleCopy = (file: GedFile) => {
    setSelectedFile(file)
    setSelectedFolder(null)
    setMoveMode("copy")
    setMoveModalOpen(true)
  }

  // Restaurer un élément de la corbeille
  const handleRestore = async (item: GedFile | GedFolder, isFolder: boolean) => {
    try {
      const endpoint = isFolder
        ? `/api/ged/folders/${item.id}/restore`
        : `/api/ged/files/${item.id}/restore`
      const response = await fetch(endpoint, { method: "POST" })

      if (response.ok) {
        toast.success("Élément restauré")
        fetchData()
      } else {
        toast.error("Erreur lors de la restauration")
      }
    } catch (error) {
      toast.error("Erreur lors de la restauration")
    }
  }

  // Supprimer définitivement
  const handlePermanentDelete = async (item: GedFile | GedFolder, isFolder: boolean) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement cet élément ? Cette action est irréversible.")) return

    try {
      const endpoint = isFolder
        ? `/api/ged/folders/${item.id}?permanent=true`
        : `/api/ged/files/${item.id}?permanent=true`
      const response = await fetch(endpoint, { method: "DELETE" })

      if (response.ok) {
        toast.success("Élément supprimé définitivement")
        fetchData()
      } else {
        toast.error("Erreur lors de la suppression")
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    }
  }

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalItems = filteredFolders.length + filteredFiles.length

  return (
    <div className="p-6 h-full">
      {/* Breadcrumb */}
      {(currentFolderId || breadcrumb.length > 0) && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <button
            onClick={navigateToRoot}
            className="flex items-center gap-1 hover:text-teal-600 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Mon espace</span>
          </button>
          {breadcrumb.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              <button
                onClick={() => navigateToFolder(item.id)}
                className="hover:text-teal-600 transition-colors"
              >
                {item.name}
              </button>
            </div>
          ))}
          {currentFolder && (
            <div className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900 font-medium">{currentFolder.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-sm text-gray-500">{totalItems} éléments</p>
        </div>
        <div className="flex items-center gap-2">
          {section !== "trash" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateFolderModalOpen(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Nouveau dossier
              </Button>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher... (Entrée pour lancer)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-l-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Folder className="h-16 w-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">Aucun fichier</p>
          <p className="text-sm">Commencez par importer des fichiers ou créer un dossier</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreateFolderModalOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Créer un dossier
            </Button>
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* Folders */}
          {filteredFolders.map((folder) => {
            const isFavorite = favoriteIds.folders.includes(folder.id)
            return (
            <div
              key={folder.id}
              className="group relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onDoubleClick={() => !section && navigateToFolder(folder.id)}
            >
              {/* Bouton favori */}
              <button
                onClick={(e) => toggleFavorite(folder.id, true, e)}
                className={`absolute top-2 left-2 h-8 w-8 flex items-center justify-center rounded-full transition-all ${
                  isFavorite
                    ? "text-yellow-500 bg-yellow-50"
                    : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-yellow-500 hover:bg-yellow-50"
                }`}
              >
                <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              </button>
              <div className="flex flex-col items-center">
                <Folder className="h-16 w-16 text-teal-500 mb-2" />
                <p className="text-sm font-medium text-gray-900 text-center truncate w-full">
                  {folder.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(folder._count?.children || 0) + (folder._count?.files || 0)} éléments
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {section === "trash" ? (
                    <>
                      <DropdownMenuItem onClick={() => handleRestore(folder, true)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePermanentDelete(folder, true)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer définitivement
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => navigateToFolder(folder.id)}>
                        <FolderInput className="h-4 w-4 mr-2" />
                        Ouvrir
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleRename(folder, true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Renommer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(folder, true)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Partager
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(folder, true)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )})}

          {/* Files */}
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.mimeType)
            const isImage = file.mimeType.startsWith("image/")
            const isFavorite = favoriteIds.files.includes(file.id)

            return (
              <div
                key={file.id}
                className="group relative bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePreview(file)}
              >
                {/* Bouton favori */}
                <button
                  onClick={(e) => toggleFavorite(file.id, false, e)}
                  className={`absolute top-2 left-2 z-10 h-8 w-8 flex items-center justify-center rounded-full transition-all ${
                    isFavorite
                      ? "text-yellow-500 bg-yellow-50"
                      : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-yellow-500 hover:bg-white/80"
                  }`}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                </button>
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={`/api/files/${file.s3Key}`}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-white/80"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  {section === "trash" ? (
                    <>
                      <DropdownMenuItem onClick={() => handleRestore(file, false)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePermanentDelete(file, false)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer définitivement
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                    <DropdownMenuItem onClick={() => handlePreview(file)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Prévisualiser
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleRename(file, false)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Renommer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMove(file)}>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Déplacer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopy(file)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare(file, false)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Partager
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(file, false)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                    </>
                  )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Taille</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Modifié</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredFolders.map((folder) => (
                <tr key={folder.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Folder className="h-8 w-8 text-teal-500" />
                      <span className="font-medium">{folder.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {(folder._count?.children || 0) + (folder._count?.files || 0)} éléments
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {format(new Date(folder.createdAt), "dd MMM yyyy", { locale: fr })}
                  </td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRename(folder, true)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Renommer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare(folder, true)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Partager
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(folder, true)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredFiles.map((file) => {
                const FileIconComponent = getFileIcon(file.mimeType)
                return (
                  <tr
                    key={file.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onDoubleClick={() => handlePreview(file)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <FileIconComponent className="h-8 w-8 text-gray-400" />
                        <span className="font-medium">{file.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {format(new Date(file.createdAt), "dd MMM yyyy", { locale: fr })}
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(file)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Prévisualiser
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRename(file, false)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Renommer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(file, false)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Partager
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(file, false)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <GedUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={fetchData}
        folderId={currentFolderId || undefined}
      />
      <GedCreateFolderModal
        open={createFolderModalOpen}
        onOpenChange={setCreateFolderModalOpen}
        onSuccess={fetchData}
        parentId={currentFolderId || undefined}
      />
      {selectedFile && (
        <GedPreviewModal
          open={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          file={selectedFile}
        />
      )}
      <GedRenameModal
        open={renameModalOpen}
        onOpenChange={setRenameModalOpen}
        file={selectedFile}
        folder={selectedFolder}
        onSuccess={fetchData}
      />
      <GedShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        file={selectedFile}
        folder={selectedFolder}
      />
      <GedMoveModal
        open={moveModalOpen}
        onOpenChange={setMoveModalOpen}
        file={selectedFile}
        mode={moveMode}
        onSuccess={fetchData}
      />
    </div>
  )
}
