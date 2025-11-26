# Guide de Migration - Système de Notifications Dynamiques

## 📋 Vue d'ensemble

Ce guide explique comment migrer le système de notifications statiques vers un système dynamique avec base de données.

## 🗄️ Modifications de la base de données

### 1. Nouveau modèle Prisma

Un nouveau modèle `DeliveryNotification` et un enum `NotificationType` ont été ajoutés au schéma Prisma :

```prisma
enum NotificationType {
  ORDER      // Notification de commande
  SYSTEM     // Notification système
  INFO       // Notification informative
}

model DeliveryNotification {
  id               String           @id @default(cuid())
  deliveryPersonId String           @map("delivery_person_id")
  title            String
  body             String
  type             NotificationType @default(INFO)
  isRead           Boolean          @default(false) @map("is_read")
  data             Json?            // Données additionnelles
  createdAt        DateTime         @default(now()) @map("created_at")
  readAt           DateTime?        @map("read_at")

  deliveryPerson DeliveryPerson @relation(fields: [deliveryPersonId], references: [id], onDelete: Cascade)

  @@index([deliveryPersonId])
  @@index([isRead])
  @@index([type])
  @@index([createdAt])
  @@map("delivery_notifications")
}
```

### 2. Relation ajoutée au modèle DeliveryPerson

```prisma
model DeliveryPerson {
  // ... autres champs
  notifications DeliveryNotification[] // Nouvelle relation
}
```

## 🔨 Commandes de migration

### Étape 1 : Générer la migration Prisma

```bash
cd /Users/domingo/Desktop/application/web-app-front/ERP/crm-sambatech
npx prisma migrate dev --name add_delivery_notifications
```

### Étape 2 : Régénérer le client Prisma

```bash
npx prisma generate
```

### Étape 3 : Vérifier la migration

```bash
npx prisma studio
```

Ouvrez Prisma Studio et vérifiez que la table `delivery_notifications` a été créée.

## 📡 APIs Backend créées

### Routes de notifications

Toutes les routes sont dans `/app/api/mobile/notifications/` :

1. **GET /api/mobile/notifications**
   - Récupère toutes les notifications du livreur
   - Query params : `limit` (défaut: 50), `onlyUnread` (true/false)
   - Retourne : `{ notifications[], unreadCount }`

2. **DELETE /api/mobile/notifications**
   - Efface toutes les notifications du livreur

3. **DELETE /api/mobile/notifications/[id]**
   - Supprime une notification spécifique

4. **POST /api/mobile/notifications/[id]/read**
   - Marque une notification comme lue

5. **POST /api/mobile/notifications/read**
   - Marque toutes les notifications comme lues

### Authentification

Toutes les routes utilisent `verifyMobileAuth` de `/lib/auth-mobile.ts` pour :
- Vérifier le token JWT
- Identifier le livreur
- Filtrer les notifications par livreur

## 📱 Modifications Mobile

### Hook use-notifications.ts

Le hook a été modifié pour utiliser les vraies APIs au lieu des données de démonstration :

```typescript
// Avant (données statiques)
const demoNotifications = [
  { id: '1', title: '...', ...}
];
setNotifications(demoNotifications);

// Après (données dynamiques)
const response = await apiService.get('/mobile/notifications');
const notifications = response.data.notifications.map(...);
setNotifications(notifications);
```

### ApiService

Ajout de la méthode `delete` dans `/services/api.ts` :

```typescript
async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  // Implémentation DELETE
}
```

## 🧪 Créer des notifications de test

### Script de test

Créez un fichier `/scripts/create-test-notifications.ts` :

```typescript
import { prisma } from '../lib/prisma';

async function createTestNotifications() {
  // Récupérer un livreur de test
  const deliveryPerson = await prisma.deliveryPerson.findFirst();
  
  if (!deliveryPerson) {
    console.log('❌ Aucun livreur trouvé');
    return;
  }

  console.log(`📬 Création de notifications de test pour ${deliveryPerson.name}`);

  // Créer des notifications de test
  await prisma.deliveryNotification.createMany({
    data: [
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Nouvelle commande',
        body: 'Une nouvelle commande a été ajoutée à votre zone Th',
        type: 'ORDER',
        isRead: false,
        data: { orderId: 'test-order-1', zoneId: 'zone1' },
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Commande livrée',
        body: 'La commande #ORD-098 a été marquée comme livrée',
        type: 'ORDER',
        isRead: true,
        data: { orderId: 'test-order-2' },
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Mise à jour système',
        body: 'Une nouvelle version de l\'application est disponible',
        type: 'SYSTEM',
        isRead: false,
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Commission calculée',
        body: 'Votre commission du jour est de 3 500 FCFA',
        type: 'INFO',
        isRead: false,
        data: { amount: 3500 },
      },
    ],
  });

  console.log('✅ Notifications de test créées avec succès');
}

createTestNotifications()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Exécuter le script

```bash
npx tsx scripts/create-test-notifications.ts
```

## 🔔 Envoi automatique de notifications

### Lors de la création d'une commande

Modifiez `/app/api/store-orders/route.ts` pour créer automatiquement une notification :

```typescript
// Après la création de la commande
if (newOrder.deliveryPersonId) {
  await prisma.deliveryNotification.create({
    data: {
      deliveryPersonId: newOrder.deliveryPersonId,
      title: 'Nouvelle commande',
      body: `Nouvelle commande #${newOrder.number} - ${newOrder.customerName}`,
      type: 'ORDER',
      isRead: false,
      data: {
        orderId: newOrder.id,
        orderNumber: newOrder.number,
        customerName: newOrder.customerName,
        total: newOrder.total,
        zoneId: newOrder.deliveryZoneId,
      },
    },
  });
  
  console.log(`📬 Notification créée pour le livreur ${newOrder.deliveryPersonId}`);
}
```

### Lors du changement de statut

Dans les routes de mise à jour de commande, créez des notifications appropriées :

```typescript
// Commande acceptée
await prisma.deliveryNotification.create({
  data: {
    deliveryPersonId: order.deliveryPersonId,
    title: 'Commande acceptée',
    body: `Vous avez accepté la commande #${order.number}`,
    type: 'ORDER',
    data: { orderId: order.id },
  },
});

// Commande livrée
await prisma.deliveryNotification.create({
  data: {
    deliveryPersonId: order.deliveryPersonId,
    title: 'Commande livrée',
    body: `La commande #${order.number} a été marquée comme livrée`,
    type: 'ORDER',
    data: { orderId: order.id, amount: order.total },
  },
});
```

## 📊 Monitoring et logs

### Logs ajoutés

Tous les endpoints incluent des logs détaillés :
- `📬 Récupération notifications pour livreur X`
- `✅ X notifications récupérées (Y non lues)`
- `✅ Notification X marquée comme lue`
- `🗑️ Suppression notification X`

### Vérification dans Prisma Studio

```bash
npx prisma studio
```

- Accédez à la table `delivery_notifications`
- Vérifiez les données
- Testez les filtres et index

## ⚠️ Points importants

### 1. Les erreurs TypeScript persisteront jusqu'à la migration

Les erreurs `Property 'deliveryNotification' does not exist` sont normales avant de lancer :
```bash
npx prisma generate
```

### 2. Authentification requise

Toutes les routes nécessitent un token JWT valide. Testez avec :
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://172.20.10.10:3001/api/mobile/notifications
```

### 3. Performance

Les index créés garantissent des performances optimales :
- Index sur `deliveryPersonId` pour filtrage rapide
- Index sur `isRead` pour compter les non lues
- Index sur `type` pour filtrer par type
- Index sur `createdAt` pour tri chronologique

## 🚀 Déploiement

### 1. En développement

```bash
# Backend
cd crm-sambatech
npx prisma migrate dev
npx prisma generate
npm run dev

# Mobile
cd inotech-driver
npm start
```

### 2. En production

```bash
# Backend
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart crm

# Mobile
eas build --platform all
```

## 🎯 Tests

### Test des APIs

```bash
# Récupérer les notifications
curl -H "Authorization: Bearer TOKEN" \
  http://172.20.10.10:3001/api/mobile/notifications

# Marquer comme lue
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://172.20.10.10:3001/api/mobile/notifications/ID/read

# Marquer toutes comme lues
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://172.20.10.10:3001/api/mobile/notifications/read

# Effacer toutes
curl -X DELETE -H "Authorization: Bearer TOKEN" \
  http://172.20.10.10:3001/api/mobile/notifications
```

### Test de l'app mobile

1. Lancez l'app sur un device
2. Naviguez vers Menu → Notifications
3. Vérifiez que les notifications s'affichent
4. Testez marquer comme lu
5. Testez effacer toutes
6. Vérifiez le badge de notifications

## 📝 Checklist de migration

- [ ] Schéma Prisma modifié
- [ ] Migration créée (`npx prisma migrate dev`)
- [ ] Client Prisma régénéré (`npx prisma generate`)
- [ ] Routes API créées et testées
- [ ] Hook mobile mis à jour
- [ ] Méthode DELETE ajoutée à ApiService
- [ ] Notifications de test créées
- [ ] Tests effectués sur l'app mobile
- [ ] Intégration avec création de commandes
- [ ] Documentation mise à jour
- [ ] Déploiement en production

## 🐛 Dépannage

### Les notifications ne s'affichent pas

1. Vérifiez que la migration a été exécutée
2. Créez des notifications de test
3. Vérifiez les logs serveur
4. Vérifiez le token d'authentification

### Erreur 401 Non autorisé

1. Vérifiez que le token est valide
2. Vérifiez que le livreur existe
3. Testez avec Postman/cURL

### Les notifications ne se mettent pas à jour

1. Vérifiez les logs de l'app mobile
2. Testez les endpoints directement
3. Vérifiez la connexion réseau

## 📚 Ressources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [React Query](https://tanstack.com/query/latest)
