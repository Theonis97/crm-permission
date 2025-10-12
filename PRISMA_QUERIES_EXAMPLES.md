# Exemples de Requêtes Prisma - Nouveau Schéma

Ce document contient des exemples pratiques d'utilisation du nouveau schéma Prisma pour la gestion des magasins, produits, commandes et livraisons.

---

## Table des Matières

1. [Gestion des Magasins](#gestion-des-magasins)
2. [Gestion des Produits](#gestion-des-produits)
3. [Gestion des Commandes](#gestion-des-commandes)
4. [Gestion des Livreurs](#gestion-des-livreurs)
5. [Gestion des Zones](#gestion-des-zones)
6. [Statistiques et Rapports](#statistiques-et-rapports)
7. [Requêtes Complexes](#requêtes-complexes)

---

## Gestion des Magasins

### Créer un magasin

```typescript
const store = await prisma.store.create({
  data: {
    name: 'Magasin Centre-Ville',
    address: '123 Rue Principale, Libreville',
    phone: '+241 01 23 45 67',
    email: 'contact@store.ga',
    whatsapp: '+241 01 23 45 67',
    logo: 'https://example.com/logo.png',
    coverImage: 'https://example.com/cover.jpg',
    isActive: true,
  }
})
```

### Obtenir un magasin avec toutes ses relations

```typescript
const storeWithRelations = await prisma.store.findUnique({
  where: { id: storeId },
  include: {
    products: {
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          }
        }
      },
      where: { isActive: true }
    },
    orders: {
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        deliveryPerson: true,
      }
    },
    deliveryPersons: {
      where: { isActive: true }
    },
    deliveryZones: {
      where: { isActive: true }
    },
  }
})
```

### Statistiques d'un magasin

```typescript
const storeStats = await prisma.store.findUnique({
  where: { id: storeId },
  include: {
    _count: {
      select: {
        products: true,
        orders: true,
        deliveryPersons: true,
        deliveryZones: true,
      }
    },
    orders: {
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      },
      select: {
        total: true,
      }
    }
  }
})

const totalRevenue = storeStats?.orders.reduce((sum, order) => sum + order.total, 0) || 0
```

---

## Gestion des Produits

### Créer un produit avec catégorie et marque

```typescript
const product = await prisma.product.create({
  data: {
    name: 'iPhone 14 Pro',
    sku: 'IPH-14-PRO-128',
    description: 'iPhone 14 Pro 128GB - Noir Sidéral',
    prixVente: 850000,
    prixAchat: 700000,
    tva: 19.25,
    stock: 20,
    minStock: 5,
    maxStock: 50,
    categoryId: categoryId,    // Obligatoire
    brandId: brandId,          // Optionnel
    photos: [
      'https://example.com/iphone-front.jpg',
      'https://example.com/iphone-back.jpg',
    ],
  }
})
```

### Ajouter un produit à un magasin

```typescript
const storeProduct = await prisma.storeProduct.create({
  data: {
    storeId: storeId,
    productId: productId,
    stock: 10,
    minStock: 3,
    isActive: true,
  }
})
```

### Obtenir les produits d'un magasin avec stock faible

```typescript
const lowStockProducts = await prisma.storeProduct.findMany({
  where: {
    storeId: storeId,
    isActive: true,
    stock: {
      lte: prisma.storeProduct.fields.minStock // stock <= minStock
    }
  },
  include: {
    product: {
      include: {
        category: true,
        brand: true,
      }
    }
  },
  orderBy: {
    stock: 'asc'
  }
})
```

### Rechercher des produits

```typescript
const searchProducts = await prisma.product.findMany({
  where: {
    OR: [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { sku: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ],
    category: {
      id: categoryId // Optionnel
    },
    brand: {
      id: brandId // Optionnel
    }
  },
  include: {
    category: true,
    brand: true,
    storeProducts: {
      where: { storeId: storeId }
    }
  },
  take: 20,
})
```

### Mettre à jour le stock d'un produit dans un magasin

```typescript
// Avec transaction pour garantir la cohérence
const result = await prisma.$transaction(async (tx) => {
  // 1. Mettre à jour le stock du magasin
  const storeProduct = await tx.storeProduct.update({
    where: {
      storeId_productId: {
        storeId: storeId,
        productId: productId,
      }
    },
    data: {
      stock: {
        increment: quantity // ou decrement pour une sortie
      }
    }
  })

  // 2. Créer un mouvement de stock
  const movement = await tx.stockMovement.create({
    data: {
      productId: productId,
      quantity: quantity,
      type: 'ENTRY', // ou 'EXIT', 'ADJUSTMENT', etc.
      note: 'Réapprovisionnement magasin',
      userId: userId,
    }
  })

  // 3. Log d'audit
  await tx.auditLog.create({
    data: {
      userId: userId,
      action: 'UPDATE',
      entity: 'StoreProduct',
      entityId: storeProduct.id,
      description: `Stock mis à jour: ${quantity} unités`,
      payload: { storeProduct, movement },
    }
  })

  return { storeProduct, movement }
})
```

---

## Gestion des Commandes

### Créer une commande complète

```typescript
const order = await prisma.order.create({
  data: {
    number: `CMD-${Date.now()}`, // Générer un numéro unique
    storeId: storeId,
    contactId: contactId, // Optionnel pour walk-in
    customerName: 'Jean Dupont',
    customerPhone: '+241 06 12 34 56',
    customerEmail: 'jean@example.com',
    deliveryAddress: '45 Avenue de la Liberté, Libreville',
    
    status: 'PENDING',
    priority: 'NORMAL',
    
    subtotal: 850000,
    totalDiscount: 50000,
    totalTax: 153950,
    deliveryFee: 2000,
    total: 955950,
    
    paymentMethod: 'MOBILE',
    paymentStatus: 'PENDING',
    
    deliveryZoneId: zoneId,
    estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000), // +2h
    
    notes: 'Livraison urgente',
    createdById: userId,
    
    items: {
      create: [
        {
          productId: product1Id,
          name: 'iPhone 14 Pro',
          sku: 'IPH-14-PRO-128',
          quantity: 1,
          unitPrice: 850000,
          discount: 50000,
          taxRate: 19.25,
          total: 800000,
        },
        // ... autres articles
      ]
    }
  },
  include: {
    items: {
      include: {
        product: true
      }
    }
  }
})
```

### Obtenir les commandes d'un magasin avec filtres

```typescript
const orders = await prisma.order.findMany({
  where: {
    storeId: storeId,
    status: {
      in: ['PENDING', 'CONFIRMED', 'PREPARING'] // Commandes actives
    },
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    paymentStatus: 'PAID',
    deliveryZoneId: zoneId, // Optionnel
  },
  include: {
    items: {
      include: {
        product: {
          include: {
            brand: true,
            category: true,
          }
        }
      }
    },
    contact: true,
    deliveryPerson: true,
    deliveryZone: true,
    createdBy: {
      select: {
        name: true,
        email: true,
      }
    }
  },
  orderBy: [
    { priority: 'desc' },
    { createdAt: 'desc' }
  ],
  take: 50,
})
```

### Assigner un livreur à une commande

```typescript
const updatedOrder = await prisma.order.update({
  where: { id: orderId },
  data: {
    deliveryPersonId: deliveryPersonId,
    status: 'DELIVERING',
  },
  include: {
    deliveryPerson: true,
  }
})

// Mettre à jour le statut du livreur
await prisma.deliveryPerson.update({
  where: { id: deliveryPersonId },
  data: {
    status: 'BUSY',
  }
})
```

### Marquer une commande comme livrée

```typescript
const completedOrder = await prisma.$transaction(async (tx) => {
  // 1. Mettre à jour la commande
  const order = await tx.order.update({
    where: { id: orderId },
    data: {
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      deliveredAt: new Date(),
      paidAt: new Date(),
    }
  })

  // 2. Libérer le livreur
  if (order.deliveryPersonId) {
    await tx.deliveryPerson.update({
      where: { id: order.deliveryPersonId },
      data: {
        status: 'AVAILABLE',
        totalDeliveries: { increment: 1 }
      }
    })
  }

  // 3. Mettre à jour les stats du client
  if (order.contactId) {
    await tx.storeContact.update({
      where: {
        storeId_contactId: {
          storeId: order.storeId,
          contactId: order.contactId,
        }
      },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: order.total },
        lastOrderAt: new Date(),
      }
    })
  }

  return order
})
```

### Annuler une commande

```typescript
const cancelledOrder = await prisma.$transaction(async (tx) => {
  // 1. Annuler la commande
  const order = await tx.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      cancelReason: reason,
    },
    include: {
      items: true,
    }
  })

  // 2. Remettre le stock (si déjà prélevé)
  for (const item of order.items) {
    await tx.storeProduct.update({
      where: {
        storeId_productId: {
          storeId: order.storeId,
          productId: item.productId,
        }
      },
      data: {
        stock: { increment: item.quantity }
      }
    })
  }

  // 3. Libérer le livreur
  if (order.deliveryPersonId) {
    await tx.deliveryPerson.update({
      where: { id: order.deliveryPersonId },
      data: { status: 'AVAILABLE' }
    })
  }

  return order
})
```

---

## Gestion des Livreurs

### Créer un livreur

```typescript
const deliveryPerson = await prisma.deliveryPerson.create({
  data: {
    storeId: storeId,
    name: 'Jacques Mballa',
    phone: '+241 06 12 34 56',
    email: 'jacques@delivery.ga',
    vehicle: 'Moto Yamaha',
    plateNumber: 'LBV-1234-AB',
    status: 'AVAILABLE',
    isActive: true,
  }
})
```

### Obtenir les livreurs disponibles

```typescript
const availableDrivers = await prisma.deliveryPerson.findMany({
  where: {
    storeId: storeId,
    status: 'AVAILABLE',
    isActive: true,
  },
  include: {
    _count: {
      select: {
        orders: {
          where: {
            status: { in: ['DELIVERING'] }
          }
        }
      }
    }
  },
  orderBy: {
    rating: 'desc'
  }
})
```

### Statistiques d'un livreur

```typescript
const driverStats = await prisma.deliveryPerson.findUnique({
  where: { id: driverId },
  include: {
    orders: {
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      },
      select: {
        deliveredAt: true,
        total: true,
      }
    },
    _count: {
      select: {
        orders: {
          where: { status: 'DELIVERED' }
        }
      }
    }
  }
})

const monthlyDeliveries = driverStats?.orders.length || 0
const monthlyRevenue = driverStats?.orders.reduce((sum, o) => sum + o.total, 0) || 0
```

---

## Gestion des Zones

### Créer une zone de livraison

```typescript
const zone = await prisma.deliveryZone.create({
  data: {
    storeId: storeId,
    name: 'Libreville Centre',
    color: '#3B82F6',
    coverage: 'Centre-ville, Montagne Sainte, Louis',
    latitude: 0.4162,
    longitude: 9.4673,
    deliveryFee: 2000,
    isActive: true,
  }
})
```

### Obtenir les zones avec statistiques

```typescript
const zonesWithStats = await prisma.deliveryZone.findMany({
  where: {
    storeId: storeId,
    isActive: true,
  },
  include: {
    _count: {
      select: {
        orders: {
          where: {
            status: { in: ['DELIVERING', 'DELIVERED'] }
          }
        }
      }
    },
    orders: {
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)) // Aujourd'hui
        }
      },
      select: {
        total: true,
      }
    }
  }
})

// Calculer les stats par zone
const zonesStats = zonesWithStats.map(zone => ({
  ...zone,
  activeOrders: zone._count.orders,
  todayRevenue: zone.orders.reduce((sum, o) => sum + o.total, 0),
}))
```

---

## Statistiques et Rapports

### Dashboard magasin

```typescript
const storeDashboard = await prisma.store.findUnique({
  where: { id: storeId },
  include: {
    _count: {
      select: {
        products: true,
        orders: true,
        deliveryPersons: { where: { isActive: true } },
        deliveryZones: { where: { isActive: true } },
      }
    },
    orders: {
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)) // Aujourd'hui
        }
      },
      select: {
        status: true,
        total: true,
        paymentStatus: true,
      }
    },
    products: {
      where: {
        stock: {
          lte: prisma.storeProduct.fields.minStock
        }
      },
      select: {
        product: {
          select: { name: true }
        },
        stock: true,
        minStock: true,
      }
    }
  }
})

// Calculer les métriques
const metrics = {
  totalOrders: storeDashboard?._count.orders || 0,
  todayOrders: storeDashboard?.orders.length || 0,
  todayRevenue: storeDashboard?.orders.reduce((sum, o) => sum + o.total, 0) || 0,
  pendingOrders: storeDashboard?.orders.filter(o => o.status === 'PENDING').length || 0,
  lowStockProducts: storeDashboard?.products.length || 0,
}
```

### Rapport des ventes par période

```typescript
const salesReport = await prisma.order.groupBy({
  by: ['status', 'paymentMethod'],
  where: {
    storeId: storeId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    }
  },
  _sum: {
    total: true,
    deliveryFee: true,
  },
  _count: {
    id: true,
  },
  _avg: {
    total: true,
  }
})
```

### Top produits vendus

```typescript
const topProducts = await prisma.orderItem.groupBy({
  by: ['productId'],
  where: {
    order: {
      storeId: storeId,
      status: 'DELIVERED',
      deliveredAt: {
        gte: startDate,
        lte: endDate,
      }
    }
  },
  _sum: {
    quantity: true,
    total: true,
  },
  _count: {
    id: true,
  },
  orderBy: {
    _sum: {
      quantity: 'desc'
    }
  },
  take: 10,
})

// Enrichir avec les infos produit
const enrichedTopProducts = await Promise.all(
  topProducts.map(async (item) => {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: {
        category: true,
        brand: true,
      }
    })
    return {
      ...item,
      product,
    }
  })
)
```

---

## Requêtes Complexes

### Recherche multi-critères avec pagination

```typescript
interface SearchParams {
  search?: string
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  page?: number
  pageSize?: number
}

async function searchProducts(storeId: string, params: SearchParams) {
  const { search, categoryId, brandId, minPrice, maxPrice, inStock, page = 1, pageSize = 20 } = params

  const where = {
    storeProducts: {
      some: {
        storeId: storeId,
        isActive: true,
        ...(inStock && { stock: { gt: 0 } })
      }
    },
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { sku: { contains: search, mode: 'insensitive' as const } },
      ]
    }),
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(minPrice && { prixVente: { gte: minPrice } }),
    ...(maxPrice && { prixVente: { lte: maxPrice } }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        storeProducts: {
          where: { storeId }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: 'asc' }
    }),
    prisma.product.count({ where })
  ])

  return {
    products,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}
```

### Analyse des performances de livraison

```typescript
const deliveryPerformance = await prisma.order.findMany({
  where: {
    storeId: storeId,
    status: 'DELIVERED',
    deliveredAt: { not: null },
    estimatedDelivery: { not: null },
  },
  select: {
    id: true,
    estimatedDelivery: true,
    deliveredAt: true,
    deliveryPerson: {
      select: {
        id: true,
        name: true,
      }
    },
    deliveryZone: {
      select: {
        id: true,
        name: true,
      }
    }
  }
})

// Calculer les délais
const performanceMetrics = deliveryPerformance.map(order => {
  const estimated = new Date(order.estimatedDelivery!).getTime()
  const actual = new Date(order.deliveredAt!).getTime()
  const delay = (actual - estimated) / (1000 * 60) // en minutes

  return {
    orderId: order.id,
    deliveryPerson: order.deliveryPerson,
    zone: order.deliveryZone,
    delay,
    onTime: delay <= 0,
  }
})

// Grouper par livreur
const driverPerformance = performanceMetrics.reduce((acc, metric) => {
  const driverId = metric.deliveryPerson?.id
  if (!driverId) return acc

  if (!acc[driverId]) {
    acc[driverId] = {
      driver: metric.deliveryPerson,
      totalDeliveries: 0,
      onTimeDeliveries: 0,
      averageDelay: 0,
      delays: []
    }
  }

  acc[driverId].totalDeliveries++
  if (metric.onTime) acc[driverId].onTimeDeliveries++
  acc[driverId].delays.push(metric.delay)

  return acc
}, {} as Record<string, any>)

// Calculer les moyennes
Object.values(driverPerformance).forEach((driver: any) => {
  driver.averageDelay = driver.delays.reduce((a: number, b: number) => a + b, 0) / driver.delays.length
  driver.onTimeRate = (driver.onTimeDeliveries / driver.totalDeliveries) * 100
  delete driver.delays
})
```

---

## Best Practices

### 1. Toujours utiliser des transactions pour les opérations multi-étapes

```typescript
await prisma.$transaction(async (tx) => {
  // Toutes vos opérations ici
})
```

### 2. Utiliser les includes avec parcimonie

```typescript
// ❌ Mauvais: trop de données
const order = await prisma.order.findUnique({
  where: { id },
  include: {
    items: {
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            storeProducts: true,
            stockMovements: true,
          }
        }
      }
    }
  }
})

// ✅ Bon: seulement ce dont vous avez besoin
const order = await prisma.order.findUnique({
  where: { id },
  select: {
    id: true,
    number: true,
    status: true,
    items: {
      select: {
        name: true,
        quantity: true,
        total: true,
      }
    }
  }
})
```

### 3. Indexer les champs de recherche fréquents

Ajoutez dans votre schéma:

```prisma
model Product {
  // ...
  
  @@index([name])
  @@index([sku])
  @@index([categoryId])
}

model Order {
  // ...
  
  @@index([storeId, status])
  @@index([createdAt])
  @@index([number])
}
```

---

Créé le: 12 octobre 2025
