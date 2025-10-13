# Configuration du système d'upload S3/MinIO

## Installation des dépendances

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
npm install --save-dev @types/uuid
```

## Configuration des variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Configuration MinIO/S3
MINIO_ENDPOINT=http://localhost:9000
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET_NAME=classertif
```

## Utilisation du composant ImageUpload

### Import

```tsx
import { ImageUpload } from "@/components/upload/image-upload"
```

### Exemple d'utilisation

```tsx
import { useState } from "react"
import { ImageUpload } from "@/components/upload/image-upload"

export function MyComponent() {
  const [imageUrl, setImageUrl] = useState("")

  return (
    <ImageUpload
      value={imageUrl}
      onChange={setImageUrl}
      folder="stores/logos"      // Dossier de destination
      aspectRatio="square"       // "square" | "video" | "wide"
      label="Télécharger une image"
      disabled={false}
    />
  )
}
```

### Avec React Hook Form

```tsx
import { useForm } from "react-hook-form"
import { ImageUpload } from "@/components/upload/image-upload"

export function MyFormComponent() {
  const { watch, setValue } = useForm()
  const logo = watch("logo")

  return (
    <ImageUpload
      value={logo}
      onChange={(url) => setValue("logo", url)}
      folder="stores/logos"
      aspectRatio="square"
    />
  )
}
```

## API Routes disponibles

### Upload de fichier
- **POST** `/api/upload`
- FormData avec `file`, `folder` (optionnel), `type` (optionnel: "image" | "video" | "document" | "any")

### Récupération de fichier
- **GET** `/api/files/{path}`
- Exemple: `/api/files/stores/logos/uuid.png`

## Types de fichiers supportés

### Images
- PNG, JPEG, JPG, WEBP, GIF, SVG
- Taille max: 50MB

### Vidéos
- MP4, MOV, AVI, WEBM
- Taille max: 50MB

### Documents
- PDF, DOC, DOCX, TXT
- Taille max: 50MB

## Fonctions utilitaires

### uploadFileToS3
```ts
import { uploadFileToS3 } from "@/lib/s3"

const result = await uploadFileToS3(file, "stores/logos")
if (result.success) {
  console.log("URL:", result.fileUrl)
  console.log("Nom:", result.fileName)
}
```

### deleteFileFromS3
```ts
import { deleteFileFromS3 } from "@/lib/s3"

const success = await deleteFileFromS3("stores/logos/uuid.png")
```

### validateFile
```ts
import { validateFile } from "@/lib/s3"

const validation = validateFile(file, "image")
if (!validation.valid) {
  console.error(validation.error)
}
```

### getSignedFileUrl
```ts
import { getSignedFileUrl } from "@/lib/s3"

const signedUrl = await getSignedFileUrl("stores/logos/uuid.png", 3600)
```

## Configuration MinIO (Développement local)

### Docker Compose

```yaml
version: '3.8'
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

### Créer le bucket

1. Accédez à la console MinIO: `http://localhost:9001`
2. Connectez-vous avec `minioadmin` / `minioadmin`
3. Créez un bucket nommé `classertif`
4. Configurez la politique d'accès public si nécessaire

## Structure des dossiers

```
uploads/
├── stores/
│   ├── logos/
│   └── covers/
├── products/
├── users/
└── documents/
```
