# Plan d'Implémentation - Module GED (Gestion Électronique de Documents)

## 1. Vue d'Ensemble

### 1.1 Objectif
Créer un système de gestion de fichiers complet permettant aux utilisateurs de :
- Organiser leurs documents dans des dossiers hiérarchiques
- Importer des fichiers (upload vers S3)
- Partager des fichiers/dossiers avec d'autres utilisateurs
- Prévisualiser les fichiers directement dans l'application
- Gérer le cycle de vie des documents (archivage, corbeille, suppression)

### 1.2 Technologies Utilisées
| Technologie | Usage |
|-------------|-------|
| **AWS S3** | Stockage des fichiers |
| **Prisma** | Modélisation des métadonnées (dossiers, fichiers, partages) |
| **Next.js API Routes** | Backend REST API |
| **React** | Interface utilisateur |
| **@aws-sdk/client-s3** | SDK AWS pour les opérations S3 |
| **@aws-sdk/s3-request-presigner** | Génération d'URLs signées pour upload/download |

---

## 2. Architecture

### 2.1 Structure S3
```
bucket-name/
├── users/
│   ├── {userId}/
│   │   ├── files/
│   │   │   ├── {fileId}-{originalName}
│   │   │   └── ...
│   │   └── thumbnails/
│   │       ├── {fileId}-thumb.jpg
│   │       └── ...
│   └── ...
└── shared/
    └── {shareId}/
        └── ...
```

### 2.2 Architecture des Données

```
┌─────────────────────────────────────────────────────────────────┐
│                        MODÈLE DE DONNÉES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User (1) ──────────────── (N) GedFolder                       │
│                                    │                            │
│                                    │ parentId (self-relation)   │
│                                    ▼                            │
│                              GedFolder (N)                      │
│                                    │                            │
│                                    │                            │
│  User (1) ──────────────── (N) GedFile                         │
│                                    │                            │
│                                    │ folderId                   │
│                                    ▼                            │
│                              GedFolder                          │
│                                                                 │
│  GedFile/GedFolder (1) ──── (N) GedShare ──── (1) User         │
│                                                                 │
│  User (1) ──────────────── (N) GedFavorite                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Modèles Prisma

### 3.1 GedFolder (Dossiers)
```prisma
model GedFolder {
  id          String      @id @default(cuid())
  name        String
  description String?
  color       String?     // Couleur du dossier (optionnel)
  icon        String?     // Icône personnalisée (optionnel)
  
  // Hiérarchie
  parentId    String?     @map("parent_id")
  parent      GedFolder?  @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children    GedFolder[] @relation("FolderHierarchy")
  
  // Propriétaire
  ownerId     String      @map("owner_id")
  owner       User        @relation("GedFolderOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  
  // Métadonnées
  isArchived  Boolean     @default(false) @map("is_archived")
  isDeleted   Boolean     @default(false) @map("is_deleted")
  deletedAt   DateTime?   @map("deleted_at")
  
  // Relations
  files       GedFile[]
  shares      GedShare[]  @relation("FolderShares")
  favorites   GedFavorite[] @relation("FolderFavorites")
  
  // Timestamps
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  @@index([ownerId])
  @@index([parentId])
  @@index([isDeleted])
  @@map("ged_folders")
}
```

### 3.2 GedFile (Fichiers)
```prisma
model GedFile {
  id            String      @id @default(cuid())
  name          String      // Nom affiché
  originalName  String      @map("original_name") // Nom original du fichier
  
  // Stockage S3
  s3Key         String      @map("s3_key") // Clé S3 du fichier
  s3Bucket      String      @map("s3_bucket")
  thumbnailKey  String?     @map("thumbnail_key") // Clé S3 de la miniature
  
  // Métadonnées fichier
  mimeType      String      @map("mime_type")
  size          Int         // Taille en bytes
  extension     String      // Extension du fichier
  
  // Organisation
  folderId      String?     @map("folder_id")
  folder        GedFolder?  @relation(fields: [folderId], references: [id], onDelete: SetNull)
  
  // Propriétaire
  ownerId       String      @map("owner_id")
  owner         User        @relation("GedFileOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  
  // État
  isArchived    Boolean     @default(false) @map("is_archived")
  isDeleted     Boolean     @default(false) @map("is_deleted")
  deletedAt     DateTime?   @map("deleted_at")
  
  // Relations
  shares        GedShare[]  @relation("FileShares")
  favorites     GedFavorite[] @relation("FileFavorites")
  versions      GedFileVersion[]
  
  // Timestamps
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@index([ownerId])
  @@index([folderId])
  @@index([mimeType])
  @@index([isDeleted])
  @@map("ged_files")
}
```

### 3.3 GedFileVersion (Versions de fichiers)
```prisma
model GedFileVersion {
  id          String    @id @default(cuid())
  fileId      String    @map("file_id")
  file        GedFile   @relation(fields: [fileId], references: [id], onDelete: Cascade)
  
  version     Int       // Numéro de version
  s3Key       String    @map("s3_key")
  size        Int
  
  createdById String    @map("created_by_id")
  createdBy   User      @relation("GedVersionCreator", fields: [createdById], references: [id])
  
  createdAt   DateTime  @default(now()) @map("created_at")

  @@unique([fileId, version])
  @@index([fileId])
  @@map("ged_file_versions")
}
```

### 3.4 GedShare (Partages)
```prisma
model GedShare {
  id          String      @id @default(cuid())
  
  // Type de partage (fichier ou dossier)
  fileId      String?     @map("file_id")
  file        GedFile?    @relation("FileShares", fields: [fileId], references: [id], onDelete: Cascade)
  
  folderId    String?     @map("folder_id")
  folder      GedFolder?  @relation("FolderShares", fields: [folderId], references: [id], onDelete: Cascade)
  
  // Utilisateur avec qui on partage
  sharedWithId String     @map("shared_with_id")
  sharedWith   User       @relation("GedSharedWith", fields: [sharedWithId], references: [id], onDelete: Cascade)
  
  // Qui a partagé
  sharedById   String     @map("shared_by_id")
  sharedBy     User       @relation("GedSharedBy", fields: [sharedById], references: [id], onDelete: Cascade)
  
  // Permissions
  canEdit      Boolean    @default(false) @map("can_edit")
  canDelete    Boolean    @default(false) @map("can_delete")
  canShare     Boolean    @default(false) @map("can_share")
  
  // Expiration (optionnel)
  expiresAt    DateTime?  @map("expires_at")
  
  createdAt    DateTime   @default(now()) @map("created_at")

  @@unique([fileId, sharedWithId])
  @@unique([folderId, sharedWithId])
  @@index([sharedWithId])
  @@index([sharedById])
  @@map("ged_shares")
}
```

### 3.5 GedFavorite (Favoris)
```prisma
model GedFavorite {
  id        String      @id @default(cuid())
  userId    String      @map("user_id")
  user      User        @relation("GedFavorites", fields: [userId], references: [id], onDelete: Cascade)
  
  fileId    String?     @map("file_id")
  file      GedFile?    @relation("FileFavorites", fields: [fileId], references: [id], onDelete: Cascade)
  
  folderId  String?     @map("folder_id")
  folder    GedFolder?  @relation("FolderFavorites", fields: [folderId], references: [id], onDelete: Cascade)
  
  createdAt DateTime    @default(now()) @map("created_at")

  @@unique([userId, fileId])
  @@unique([userId, folderId])
  @@index([userId])
  @@map("ged_favorites")
}
```

---

## 4. APIs Backend

### 4.1 Structure des Endpoints

#### Dossiers
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/ged/folders` | Liste des dossiers (racine ou enfants) |
| GET | `/api/ged/folders/[id]` | Détails d'un dossier |
| POST | `/api/ged/folders` | Créer un dossier |
| PUT | `/api/ged/folders/[id]` | Renommer/modifier un dossier |
| DELETE | `/api/ged/folders/[id]` | Supprimer un dossier (soft delete) |
| POST | `/api/ged/folders/[id]/restore` | Restaurer un dossier |

#### Fichiers
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/ged/files` | Liste des fichiers |
| GET | `/api/ged/files/[id]` | Détails d'un fichier |
| POST | `/api/ged/files/upload` | Upload d'un fichier (presigned URL) |
| POST | `/api/ged/files/confirm` | Confirmer l'upload |
| PUT | `/api/ged/files/[id]` | Renommer/déplacer un fichier |
| DELETE | `/api/ged/files/[id]` | Supprimer un fichier (soft delete) |
| POST | `/api/ged/files/[id]/restore` | Restaurer un fichier |
| GET | `/api/ged/files/[id]/download` | Obtenir URL de téléchargement |
| GET | `/api/ged/files/[id]/preview` | Obtenir URL de prévisualisation |

#### Partages
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/ged/shares` | Liste des éléments partagés avec moi |
| GET | `/api/ged/shares/by-me` | Liste des éléments que j'ai partagés |
| POST | `/api/ged/shares` | Créer un partage |
| PUT | `/api/ged/shares/[id]` | Modifier les permissions |
| DELETE | `/api/ged/shares/[id]` | Supprimer un partage |

#### Favoris
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/ged/favorites` | Liste des favoris |
| POST | `/api/ged/favorites` | Ajouter aux favoris |
| DELETE | `/api/ged/favorites/[id]` | Retirer des favoris |

#### Corbeille
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/ged/trash` | Liste des éléments supprimés |
| POST | `/api/ged/trash/empty` | Vider la corbeille |
| DELETE | `/api/ged/trash/[id]` | Supprimer définitivement |

#### Statistiques
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/ged/stats` | Statistiques de stockage |

---

## 5. Service S3

### 5.1 Configuration
```typescript
// lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET!
```

### 5.2 Fonctions Principales
```typescript
// Générer une URL présignée pour l'upload
async function getUploadPresignedUrl(key: string, contentType: string, expiresIn = 3600)

// Générer une URL présignée pour le téléchargement
async function getDownloadPresignedUrl(key: string, expiresIn = 3600)

// Supprimer un fichier
async function deleteFile(key: string)

// Copier un fichier (pour les versions)
async function copyFile(sourceKey: string, destinationKey: string)
```

---

## 6. Interface Utilisateur

### 6.1 Structure des Pages
```
/dashboard/ged/
├── page.tsx                    # Page principale (Mon espace)
├── layout.tsx                  # Layout avec sidebar
├── folders/
│   └── [id]/
│       └── page.tsx            # Contenu d'un dossier
├── shared/
│   └── page.tsx                # Fichiers partagés avec moi
├── favorites/
│   └── page.tsx                # Mes favoris
├── trash/
│   └── page.tsx                # Corbeille
└── search/
    └── page.tsx                # Recherche
```

### 6.2 Composants

#### Sidebar
```
┌─────────────────────────┐
│  [+] Importer           │
├─────────────────────────┤
│  📁 Mon espace          │
│  📄 Tous les fichiers   │
│  📂 Dossiers            │
│  🔗 Partagés            │
│  ⭐ Favoris             │
│  🗑️ Corbeille           │
├─────────────────────────┤
│  📷 Images              │
│  🎬 Vidéos              │
│  🔊 Audio               │
│  📄 Documents           │
├─────────────────────────┤
│  Stockage utilisé       │
│  ████████░░ 7.4/5 Go    │
│  [Augmenter]            │
└─────────────────────────┘
```

#### Composants Principaux
| Composant | Description |
|-----------|-------------|
| `GedSidebar` | Navigation latérale |
| `GedToolbar` | Barre d'outils (recherche, vue, tri) |
| `GedBreadcrumb` | Fil d'Ariane pour la navigation |
| `GedFileGrid` | Affichage en grille des fichiers |
| `GedFileList` | Affichage en liste des fichiers |
| `GedFileCard` | Carte d'un fichier (grille) |
| `GedFileRow` | Ligne d'un fichier (liste) |
| `GedFolderCard` | Carte d'un dossier |
| `GedUploadModal` | Modal d'upload |
| `GedPreviewModal` | Modal de prévisualisation |
| `GedShareModal` | Modal de partage |
| `GedCreateFolderModal` | Modal de création de dossier |
| `GedRenameModal` | Modal de renommage |
| `GedContextMenu` | Menu contextuel (clic droit) |
| `GedStorageIndicator` | Indicateur de stockage |

### 6.3 Fonctionnalités UI

#### Modes d'Affichage
- **Grille** : Affichage en miniatures (comme l'image fournie)
- **Liste** : Affichage en tableau avec détails

#### Actions sur les Fichiers
- Clic simple : Sélection
- Double-clic : Ouvrir/Prévisualiser
- Clic droit : Menu contextuel
- Drag & Drop : Déplacer vers un dossier
- Multi-sélection : Ctrl/Cmd + clic

#### Menu Contextuel
```
┌─────────────────────────┐
│  👁️ Prévisualiser       │
│  📥 Télécharger         │
├─────────────────────────┤
│  ✏️ Renommer            │
│  📁 Déplacer vers...    │
│  📋 Copier              │
├─────────────────────────┤
│  🔗 Partager            │
│  ⭐ Ajouter aux favoris │
├─────────────────────────┤
│  📦 Archiver            │
│  🗑️ Supprimer           │
└─────────────────────────┘
```

---

## 7. Prévisualisation des Fichiers

### 7.1 Types Supportés

| Type | Extensions | Méthode de prévisualisation |
|------|------------|----------------------------|
| **Images** | jpg, jpeg, png, gif, webp, svg | `<img>` natif |
| **PDF** | pdf | `<iframe>` ou react-pdf |
| **Vidéos** | mp4, webm, mov | `<video>` natif |
| **Audio** | mp3, wav, ogg | `<audio>` natif |
| **Documents Office** | docx, xlsx, pptx | Google Docs Viewer ou Office Online |
| **Texte** | txt, md, json, csv | Affichage texte avec highlight |
| **Code** | js, ts, py, html, css | Syntax highlighting |

### 7.2 Composant de Prévisualisation
```typescript
// Logique de prévisualisation
const getPreviewComponent = (file: GedFile) => {
  const type = getFileType(file.mimeType)
  
  switch (type) {
    case 'image':
      return <ImagePreview url={file.previewUrl} />
    case 'pdf':
      return <PdfPreview url={file.previewUrl} />
    case 'video':
      return <VideoPreview url={file.previewUrl} />
    case 'audio':
      return <AudioPreview url={file.previewUrl} />
    case 'document':
      return <DocumentPreview url={file.previewUrl} />
    case 'text':
      return <TextPreview url={file.previewUrl} />
    default:
      return <NoPreview file={file} />
  }
}
```

---

## 8. Permissions

### 8.1 Permissions du Module GED

| Permission | Description |
|------------|-------------|
| `ged.view` | Accéder au module GED |
| `ged.upload` | Importer des fichiers |
| `ged.download` | Télécharger des fichiers |
| `ged.create_folder` | Créer des dossiers |
| `ged.edit` | Renommer/modifier des fichiers |
| `ged.delete` | Supprimer des fichiers |
| `ged.share` | Partager des fichiers |
| `ged.admin` | Administration complète |

### 8.2 Permissions de Partage

| Permission | Description |
|------------|-------------|
| `canEdit` | Peut modifier le fichier |
| `canDelete` | Peut supprimer le fichier |
| `canShare` | Peut re-partager le fichier |

---

## 9. Variables d'Environnement

```env
# AWS S3
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name

# Limites
GED_MAX_FILE_SIZE=104857600  # 100 MB
GED_MAX_STORAGE_PER_USER=5368709120  # 5 GB
```

---

## 10. Plan d'Implémentation par Phases

### Phase 1 : Fondations (Semaine 1)
- [ ] Créer les modèles Prisma
- [ ] Configurer le service S3
- [ ] Créer les APIs de base (CRUD dossiers/fichiers)
- [ ] Implémenter l'upload avec presigned URLs

### Phase 2 : Interface de Base (Semaine 2)
- [ ] Créer le layout et la sidebar
- [ ] Implémenter la vue grille et liste
- [ ] Créer les modals (upload, création dossier)
- [ ] Implémenter la navigation dans les dossiers

### Phase 3 : Fonctionnalités Avancées (Semaine 3)
- [ ] Implémenter le partage
- [ ] Créer la prévisualisation des fichiers
- [ ] Implémenter les favoris
- [ ] Créer la corbeille et la restauration

### Phase 4 : Finitions (Semaine 4)
- [ ] Implémenter la recherche
- [ ] Ajouter le drag & drop
- [ ] Optimiser les performances
- [ ] Tests et corrections de bugs

---

## 11. Sécurité

### 11.1 Mesures de Sécurité

1. **URLs Présignées** : Toutes les URLs S3 sont présignées avec expiration
2. **Validation des Types** : Vérification des types MIME côté serveur
3. **Limite de Taille** : Limite de taille par fichier et par utilisateur
4. **Isolation des Données** : Chaque utilisateur ne voit que ses fichiers
5. **Permissions Granulaires** : Contrôle fin des accès partagés
6. **Soft Delete** : Les fichiers ne sont pas supprimés immédiatement

### 11.2 Validation des Fichiers

```typescript
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Vidéos
  'video/mp4', 'video/webm', 'video/quicktime',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  // Texte
  'text/plain', 'text/csv', 'application/json',
]
```

---

## 12. Estimation du Stockage

### 12.1 Calcul du Stockage Utilisé

```typescript
async function getUserStorageUsed(userId: string): Promise<number> {
  const result = await prisma.gedFile.aggregate({
    where: {
      ownerId: userId,
      isDeleted: false,
    },
    _sum: {
      size: true,
    },
  })
  return result._sum.size || 0
}
```

### 12.2 Affichage du Stockage

```
Stockage utilisé
████████░░░░░░░░ 7.4 Mo sur 5 Go
[Augmenter]
```

---

## 13. Prochaines Étapes

1. **Valider ce plan** avec l'équipe
2. **Créer les modèles Prisma** et migrer la base de données
3. **Configurer AWS S3** et tester la connexion
4. **Développer les APIs** une par une
5. **Créer l'interface** progressivement
6. **Tester** chaque fonctionnalité

---

*Document créé le 28 janvier 2026*
