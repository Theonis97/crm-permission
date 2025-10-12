# 🎨 Guide - Système de Variantes de Produits

## ✅ Ajouté au Schéma Prisma

Le système de **variantes de produits** a été ajouté pour supporter les produits avec plusieurs options (taille, couleur, capacité, etc.).

---

## 📦 Modèle ProductVariant

```prisma
model ProductVariant {
  id              String   @id @default(cuid())
  productId       String
  sku             String   @unique              // SKU unique par variante
  name            String?                       // Nom de la variante
  
  // Prix spécifiques (peut différer du produit parent)
  prixVente       Float?
  prixAchat       Float?
  
  // Stock spécifique à la variante
  stock           Int      @default(0)
  minStock        Int      @default(0)
  
  // Attributs (JSON flexible)
  attributes      Json     // {color: "Noir", size: "128GB", material: "Cuir"}
  
  // Images spécifiques
  images          String[] @default([])
  
  // Dimensions (optionnel)
  weight          Float?   // kg
  length          Float?   // cm
  width           Float?   // cm
  height          Float?   // cm
  
  isActive        Boolean  @default(true)
  
  product         Product
  orderItems      OrderItem[]
}
```

---

## 🎯 Cas d'Usage

### Exemple 1: T-Shirt avec Tailles et Couleurs

**Produit Parent:**
```typescript
const tshirt = await prisma.product.create({
  data: {
    name: 'T-Shirt Premium',
    sku: 'TSHIRT-PREM',
    description: 'T-shirt en coton bio',
    prixVente: 15000,  // Prix de base
    prixAchat: 8000,
    categoryId: 'vetements-id',
    photos: ['tshirt-main.jpg']
  }
})
```

**Variantes:**
```typescript
// Variante 1: Taille M - Couleur Rouge
await prisma.productVariant.create({
  data: {
    productId: tshirt.id,
    sku: 'TSHIRT-PREM-M-RED',
    name: 'T-Shirt Premium - M - Rouge',
    prixVente: 15000,
    stock: 25,
    minStock: 5,
    attributes: {
      size: 'M',
      color: 'Rouge',
      colorCode: '#FF0000'
    },
    images: ['tshirt-red-m.jpg']
  }
})

// Variante 2: Taille L - Couleur Bleu
await prisma.productVariant.create({
  data: {
    productId: tshirt.id,
    sku: 'TSHIRT-PREM-L-BLUE',
    name: 'T-Shirt Premium - L - Bleu',
    prixVente: 15000,
    stock: 30,
    minStock: 5,
    attributes: {
      size: 'L',
      color: 'Bleu',
      colorCode: '#0000FF'
    },
    images: ['tshirt-blue-l.jpg']
  }
})

// Variante 3: Taille XL - Couleur Noir (Prix différent)
await prisma.productVariant.create({
  data: {
    productId: tshirt.id,
    sku: 'TSHIRT-PREM-XL-BLACK',
    name: 'T-Shirt Premium - XL - Noir',
    prixVente: 17000,  // Prix plus élevé pour XL
    stock: 15,
    minStock: 3,
    attributes: {
      size: 'XL',
      color: 'Noir',
      colorCode: '#000000'
    },
    images: ['tshirt-black-xl.jpg']
  }
})
```

---

### Exemple 2: Smartphone avec Capacités et Couleurs

**Produit Parent:**
```typescript
const iphone = await prisma.product.create({
  data: {
    name: 'iPhone 14 Pro',
    sku: 'IPHONE-14-PRO',
    description: 'iPhone 14 Pro avec Dynamic Island',
    prixVente: 850000,  // Prix de base
    prixAchat: 700000,
    categoryId: 'smartphones-id',
    brandId: 'apple-id',
    photos: ['iphone-main.jpg']
  }
})
```

**Variantes:**
```typescript
const variants = [
  // 128GB
  {
    sku: 'IPHONE-14-PRO-128-BLACK',
    name: 'iPhone 14 Pro 128GB - Noir Sidéral',
    prixVente: 850000,
    stock: 10,
    attributes: { storage: '128GB', color: 'Noir Sidéral' },
    images: ['iphone-black-128.jpg']
  },
  {
    sku: 'IPHONE-14-PRO-128-GOLD',
    name: 'iPhone 14 Pro 128GB - Or',
    prixVente: 850000,
    stock: 8,
    attributes: { storage: '128GB', color: 'Or' },
    images: ['iphone-gold-128.jpg']
  },
  
  // 256GB (Prix plus élevé)
  {
    sku: 'IPHONE-14-PRO-256-BLACK',
    name: 'iPhone 14 Pro 256GB - Noir Sidéral',
    prixVente: 950000,
    stock: 5,
    attributes: { storage: '256GB', color: 'Noir Sidéral' },
    images: ['iphone-black-256.jpg']
  },
  {
    sku: 'IPHONE-14-PRO-256-SILVER',
    name: 'iPhone 14 Pro 256GB - Argent',
    prixVente: 950000,
    stock: 6,
    attributes: { storage: '256GB', color: 'Argent' },
    images: ['iphone-silver-256.jpg']
  },
  
  // 512GB (Prix le plus élevé)
  {
    sku: 'IPHONE-14-PRO-512-BLACK',
    name: 'iPhone 14 Pro 512GB - Noir Sidéral',
    prixVente: 1150000,
    stock: 3,
    attributes: { storage: '512GB', color: 'Noir Sidéral' },
    images: ['iphone-black-512.jpg']
  }
]

// Créer toutes les variantes
for (const variant of variants) {
  await prisma.productVariant.create({
    data: {
      ...variant,
      productId: iphone.id,
      minStock: 2
    }
  })
}
```

---

### Exemple 3: Chaussures avec Pointures et Couleurs

```typescript
const sneaker = await prisma.product.create({
  data: {
    name: 'Nike Air Max 90',
    sku: 'NIKE-AM90',
    prixVente: 85000,
    categoryId: 'chaussures-id',
    brandId: 'nike-id'
  }
})

// Générer automatiquement toutes les combinaisons
const sizes = [38, 39, 40, 41, 42, 43, 44, 45]
const colors = [
  { name: 'Blanc', code: '#FFFFFF' },
  { name: 'Noir', code: '#000000' },
  { name: 'Rouge', code: '#FF0000' }
]

for (const size of sizes) {
  for (const color of colors) {
    await prisma.productVariant.create({
      data: {
        productId: sneaker.id,
        sku: `NIKE-AM90-${size}-${color.name.toUpperCase()}`,
        name: `Nike Air Max 90 - Taille ${size} - ${color.name}`,
        prixVente: 85000,
        stock: Math.floor(Math.random() * 20) + 5, // Stock aléatoire 5-25
        minStock: 3,
        attributes: {
          size: size,
          color: color.name,
          colorCode: color.code
        }
      }
    })
  }
}
// Résultat: 8 tailles × 3 couleurs = 24 variantes créées
```

---

## 🛒 Commander une Variante

### Lier la Variante à la Commande

```typescript
const order = await prisma.order.create({
  data: {
    number: 'CMD-001',
    storeId: 'store-1',
    customerName: 'Jean Dupont',
    customerPhone: '+241 06 12 34 56',
    total: 850000,
    createdById: userId,
    items: {
      create: [
        {
          productId: iphone.id,
          variantId: 'variant-iphone-128-black-id', // ⭐ Variante spécifique
          name: 'iPhone 14 Pro',
          sku: 'IPHONE-14-PRO-128-BLACK',
          variantName: 'iPhone 14 Pro 128GB - Noir Sidéral',
          variantAttributes: {  // Snapshot des attributs
            storage: '128GB',
            color: 'Noir Sidéral'
          },
          quantity: 1,
          unitPrice: 850000,
          total: 850000
        }
      ]
    }
  }
})
```

---

## 📊 Requêtes Utiles

### 1. Obtenir un Produit avec Toutes ses Variantes

```typescript
const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    variants: {
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    },
    category: true,
    brand: true
  }
})

console.log(`Produit: ${product.name}`)
console.log(`Variantes disponibles: ${product.variants.length}`)
product.variants.forEach(v => {
  console.log(`- ${v.name}: ${v.stock} en stock (SKU: ${v.sku})`)
})
```

### 2. Rechercher Variantes par Attributs

```typescript
// Trouver tous les T-shirts rouges en taille M
const redShirts = await prisma.productVariant.findMany({
  where: {
    product: {
      name: { contains: 'T-Shirt' }
    },
    attributes: {
      path: ['color'],
      equals: 'Rouge'
    },
    isActive: true
  },
  include: {
    product: true
  }
})
```

### 3. Stock Total par Produit (toutes variantes)

```typescript
const productWithStock = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    variants: {
      select: {
        sku: true,
        stock: true,
        attributes: true
      }
    }
  }
})

const totalStock = productWithStock.variants.reduce(
  (sum, v) => sum + v.stock, 
  0
)
console.log(`Stock total: ${totalStock}`)
```

### 4. Variantes en Rupture de Stock

```typescript
const lowStockVariants = await prisma.productVariant.findMany({
  where: {
    OR: [
      { stock: { lte: prisma.productVariant.fields.minStock } },
      { stock: 0 }
    ],
    isActive: true
  },
  include: {
    product: {
      select: {
        name: true,
        category: true
      }
    }
  },
  orderBy: {
    stock: 'asc'
  }
})
```

### 5. Meilleures Ventes par Variante

```typescript
const topVariants = await prisma.orderItem.groupBy({
  by: ['variantId'],
  where: {
    variantId: { not: null },
    order: {
      status: 'DELIVERED'
    }
  },
  _sum: {
    quantity: true,
    total: true
  },
  _count: {
    id: true
  },
  orderBy: {
    _sum: {
      quantity: 'desc'
    }
  },
  take: 10
})

// Enrichir avec les infos variante
const enriched = await Promise.all(
  topVariants.map(async (item) => {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: { product: true }
    })
    return {
      variant,
      quantitySold: item._sum.quantity,
      revenue: item._sum.total,
      orders: item._count.id
    }
  })
)
```

---

## 🎨 Interface Utilisateur - Sélection de Variantes

### Frontend React Example

```tsx
'use client'

import { useState } from 'react'

interface Variant {
  id: string
  sku: string
  name: string
  prixVente: number
  stock: number
  attributes: {
    color?: string
    size?: string
    storage?: string
  }
  images: string[]
}

export function ProductVariantSelector({ product, variants }: Props) {
  const [selectedColor, setSelectedColor] = useState<string>()
  const [selectedSize, setSelectedSize] = useState<string>()
  const [selectedVariant, setSelectedVariant] = useState<Variant>()

  // Extraire les options uniques
  const colors = [...new Set(variants.map(v => v.attributes.color))]
  const sizes = [...new Set(variants.map(v => v.attributes.size))]

  // Filtrer les variantes disponibles
  const availableVariants = variants.filter(v => {
    if (selectedColor && v.attributes.color !== selectedColor) return false
    if (selectedSize && v.attributes.size !== selectedSize) return false
    return v.stock > 0
  })

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    updateSelectedVariant(color, selectedSize)
  }

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size)
    updateSelectedVariant(selectedColor, size)
  }

  const updateSelectedVariant = (color?: string, size?: string) => {
    const variant = variants.find(
      v => v.attributes.color === color && v.attributes.size === size
    )
    setSelectedVariant(variant)
  }

  return (
    <div>
      <h2>{product.name}</h2>
      
      {/* Sélection Couleur */}
      <div className="mb-4">
        <label>Couleur:</label>
        <div className="flex gap-2">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={selectedColor === color ? 'selected' : ''}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Sélection Taille */}
      <div className="mb-4">
        <label>Taille:</label>
        <div className="flex gap-2">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => handleSizeSelect(size)}
              className={selectedSize === size ? 'selected' : ''}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Prix et Stock */}
      {selectedVariant && (
        <div>
          <p className="text-2xl font-bold">
            {selectedVariant.prixVente.toLocaleString()} FCFA
          </p>
          <p className={selectedVariant.stock > 0 ? 'text-green-600' : 'text-red-600'}>
            {selectedVariant.stock > 0 
              ? `${selectedVariant.stock} en stock` 
              : 'Rupture de stock'}
          </p>
          <button 
            disabled={selectedVariant.stock === 0}
            onClick={() => addToCart(selectedVariant)}
          >
            Ajouter au panier
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## 🔄 Migration des Données Existantes

Si vous avez déjà des produits sans variantes:

```typescript
// Script de migration pour créer une variante "standard" par produit
async function migrateToVariants() {
  const products = await prisma.product.findMany()

  for (const product of products) {
    // Créer une variante "standard" avec le stock actuel
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: product.sku || `${product.id}-STANDARD`,
        name: `${product.name} - Standard`,
        prixVente: product.prixVente,
        prixAchat: product.prixAchat,
        stock: product.stock,
        minStock: product.minStock,
        attributes: {
          type: 'standard'
        },
        images: product.photos
      }
    })
  }
  
  console.log(`✅ ${products.length} produits migrés vers le système de variantes`)
}
```

---

## 📋 Checklist d'Implémentation

- [x] Modèle `ProductVariant` créé ✅
- [x] Relation `Product` → `ProductVariant[]` ✅
- [x] Relation `OrderItem` → `ProductVariant` ✅
- [x] Champs snapshot dans `OrderItem` ✅
- [x] Index sur `productId` et `sku` ✅
- [ ] Migration de données existantes
- [ ] API Routes pour variantes
- [ ] Interface sélection variantes
- [ ] Gestion stock par variante
- [ ] Filtres par attributs
- [ ] Tests E2E variantes

---

## 🎯 Best Practices

### 1. **Toujours avoir un SKU unique par variante**
```typescript
// ✅ Bon
sku: 'TSHIRT-PREM-M-RED'

// ❌ Mauvais (dupliqué)
sku: 'TSHIRT-PREM'
```

### 2. **Snapshot des attributs dans OrderItem**
Sauvegarde les attributs au moment de la commande (pas de référence directe):
```typescript
variantAttributes: {
  color: 'Rouge',
  size: 'M'
}
```

### 3. **Gérer le stock au niveau de la variante**
Le stock du produit parent peut être la somme ou zéro:
```typescript
// Option 1: Stock parent = 0, tout dans les variantes
product.stock = 0

// Option 2: Stock parent = somme des variantes (calculé)
product.stock = variants.reduce((sum, v) => sum + v.stock, 0)
```

### 4. **Prix flexibles**
```typescript
// Si prixVente null → utiliser le prix du produit parent
const effectivePrice = variant.prixVente ?? product.prixVente
```

---

**Version: 3.1.0 - Variantes de Produits**  
**Date: 12 octobre 2025**  
**Schéma validé: ✅**
