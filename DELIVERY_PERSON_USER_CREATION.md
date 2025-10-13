# Création Automatique d'Utilisateur pour les Livreurs

## Vue d'ensemble
Lorsqu'un livreur est créé avec un email, le système crée **automatiquement un compte utilisateur** avec un mot de passe par défaut.

## Fonctionnalités

### 1. Création Automatique d'Utilisateur
Lors de la création d'un livreur via `/api/delivery-persons` (POST), si un **email est fourni** :

✅ Un compte utilisateur est créé automatiquement  
✅ Mot de passe par défaut : **`innotech`**  
✅ Un rôle approprié est assigné  
✅ Le livreur peut se connecter immédiatement  

### 2. Validation de l'Email
Le système vérifie que l'email n'existe pas déjà :
- ❌ Si l'email existe → Erreur 400 : "Un utilisateur avec cet email existe déjà."
- ✅ Si l'email est unique → Création du compte

### 3. Attribution du Rôle
Le système cherche et assigne un rôle dans cet ordre :
1. **"Livreur"** (priorité)
2. **"Delivery"**
3. **"Courier"**
4. **"Utilisateur"** (par défaut si aucun rôle livreur n'existe)

### 4. Extraction des Noms
Le nom complet du livreur est automatiquement divisé :
```typescript
Nom complet: "Jean Dupont"
↓
firstName: "Jean"
lastName: "Dupont"
```

## API Backend

### Endpoint POST `/api/delivery-persons`

#### Request Body
```json
{
  "storeId": "xxx",
  "name": "Jean Dupont",
  "phone": "+241 06 12 34 56 78",
  "email": "jean.dupont@example.com", // ✨ Optionnel mais déclenche la création d'utilisateur
  "vehicle": "Moto",
  "plateNumber": "AB-123-CD",
  "status": "AVAILABLE"
}
```

#### Response (Success 201)
```json
{
  "deliveryPerson": {
    "id": "xxx",
    "name": "Jean Dupont",
    "phone": "+241 06 12 34 56 78",
    "email": "jean.dupont@example.com",
    "storeId": "xxx",
    "status": "AVAILABLE",
    // ... autres champs
  },
  "userCreated": true,               // ✨ Indique si un utilisateur a été créé
  "userEmail": "jean.dupont@example.com",
  "defaultPassword": "innotech"      // ✨ Mot de passe par défaut
}
```

#### Response (Email déjà existant - 400)
```json
{
  "error": "Un utilisateur avec cet email existe déjà."
}
```

## Flux de Création

```
1. Formulaire de création de livreur
   ↓
2. API reçoit les données
   ↓
3. Validation (nom, téléphone, magasin requis)
   ↓
4. Si email fourni :
   ├─ Vérifier que l'email n'existe pas
   ├─ Hasher le mot de passe "innotech"
   ├─ Extraire firstName et lastName
   ├─ Chercher un rôle approprié
   ├─ Créer l'utilisateur
   └─ Assigner le rôle
   ↓
5. Créer le livreur
   ↓
6. Retourner les informations + confirmation de création utilisateur
```

## Sécurité

### Mot de Passe
- **Hashage** : bcrypt avec 12 rounds (très sécurisé)
- **Stockage** : Seul le hash est stocké en base de données
- **Par défaut** : `innotech`
- ⚠️ **Important** : Le livreur doit changer son mot de passe lors de la première connexion

### Recommandations
1. **Forcer le changement de mot de passe** à la première connexion
2. **Informer le livreur** de ses identifiants par email ou SMS
3. **Ne jamais afficher** le mot de passe dans l'interface (sauf confirmation de création)

## Cas d'Usage

### Cas 1 : Création avec email
**Données :**
```json
{
  "name": "Marie Martin",
  "phone": "06 12 34 56 78",
  "email": "marie.martin@example.com",
  "storeId": "xxx"
}
```

**Résultat :**
- ✅ Livreur créé
- ✅ Utilisateur créé avec email "marie.martin@example.com"
- ✅ Mot de passe : "innotech"
- ✅ Rôle assigné (Livreur ou Utilisateur)
- ✅ Peut se connecter immédiatement

### Cas 2 : Création sans email
**Données :**
```json
{
  "name": "Paul Bernard",
  "phone": "06 98 76 54 32",
  "storeId": "xxx"
}
```

**Résultat :**
- ✅ Livreur créé
- ❌ Aucun utilisateur créé
- ⚠️ Ne peut pas se connecter à l'application

### Cas 3 : Email déjà existant
**Données :**
```json
{
  "name": "Sophie Laurent",
  "phone": "06 11 22 33 44",
  "email": "admin@example.com", // Email déjà utilisé
  "storeId": "xxx"
}
```

**Résultat :**
- ❌ Erreur 400
- ❌ Aucun livreur créé
- ❌ Message : "Un utilisateur avec cet email existe déjà."

## Interface Utilisateur

### Recommandations d'Affichage

#### 1. Toast de Confirmation
Après création réussie, afficher :
```
✅ Livreur créé avec succès !
📧 Compte utilisateur créé pour : marie.martin@example.com
🔑 Mot de passe par défaut : innotech
```

#### 2. Modal de Récapitulatif
```
╔═══════════════════════════════════════╗
║   Livreur créé avec succès !          ║
╠═══════════════════════════════════════╣
║ 👤 Nom : Jean Dupont                  ║
║ 📧 Email : jean.dupont@example.com    ║
║ 📱 Téléphone : 06 12 34 56 78         ║
║                                       ║
║ ✅ Compte utilisateur créé            ║
║ 🔑 Mot de passe : innotech            ║
║                                       ║
║ ⚠️  Pensez à transmettre ces          ║
║    informations au livreur !          ║
╚═══════════════════════════════════════╝
```

#### 3. Champ Email dans le Formulaire
```typescript
<div>
  <Label htmlFor="email">
    Email
    <Badge className="ml-2" variant="outline">
      Créera un compte utilisateur
    </Badge>
  </Label>
  <Input
    id="email"
    type="email"
    placeholder="livreur@example.com"
  />
  <p className="text-xs text-gray-500 mt-1">
    💡 Si un email est fourni, un compte sera créé automatiquement 
    avec le mot de passe : <code className="font-mono">innotech</code>
  </p>
</div>
```

## Base de Données

### Tables Affectées

#### 1. `users`
```sql
INSERT INTO users (
  email,
  name,
  firstName,
  lastName,
  password, -- Hash bcrypt de "innotech"
  status
) VALUES (...)
```

#### 2. `user_roles`
```sql
INSERT INTO user_roles (
  userId,
  roleId -- ID du rôle "Livreur" ou "Utilisateur"
) VALUES (...)
```

#### 3. `delivery_persons`
```sql
INSERT INTO delivery_persons (
  storeId,
  name,
  phone,
  email, -- Même email que l'utilisateur
  ...
) VALUES (...)
```

### Relations
```
User (email: "jean@example.com")
  ↓
UserRole → Role (name: "Livreur")
  
DeliveryPerson (email: "jean@example.com")
  ↓ (lien par email)
User
```

**Note :** Il n'y a pas de clé étrangère directe entre `DeliveryPerson` et `User`. Le lien se fait par l'**email**.

## Gestion des Rôles

### Créer un Rôle "Livreur" (Recommandé)

Pour avoir un rôle spécifique aux livreurs, ajoutez dans votre seed ou via SQL :

```typescript
// Dans prisma/seed.ts
await prisma.role.create({
  data: {
    name: "Livreur",
    description: "Livreur avec accès aux commandes de livraison",
    isSystem: false,
  },
})
```

Puis assignez les permissions appropriées :
```typescript
const livreurPermissions = [
  "orders.view",        // Voir les commandes
  "orders.update",      // Mettre à jour le statut
  "delivery-zones.view", // Voir les zones
  // ... autres permissions
]
```

## Tests

### Tests Manuels

#### Test 1 : Création avec email
1. ✅ Créer un livreur avec email
2. ✅ Vérifier que l'utilisateur existe dans la table `users`
3. ✅ Se connecter avec l'email et le mot de passe "innotech"
4. ✅ Vérifier que le rôle est assigné

#### Test 2 : Email déjà existant
1. ✅ Créer un utilisateur avec email "test@example.com"
2. ✅ Essayer de créer un livreur avec le même email
3. ✅ Vérifier l'erreur 400
4. ✅ Vérifier qu'aucun livreur n'a été créé

#### Test 3 : Création sans email
1. ✅ Créer un livreur sans email
2. ✅ Vérifier que le livreur est créé
3. ✅ Vérifier qu'aucun utilisateur n'a été créé
4. ✅ Vérifier qu'on ne peut pas se connecter

### Tests Unitaires (Recommandés)
```typescript
describe('POST /api/delivery-persons', () => {
  it('should create user when email is provided', async () => {
    // ...
  })

  it('should not create user when email is missing', async () => {
    // ...
  })

  it('should fail when email already exists', async () => {
    // ...
  })

  it('should assign correct role', async () => {
    // ...
  })
})
```

## Améliorations Futures

### Court Terme
- [ ] Envoyer un email de bienvenue avec les identifiants
- [ ] Envoyer un SMS avec les identifiants
- [ ] Forcer le changement de mot de passe à la première connexion
- [ ] Ajouter un bouton "Réinitialiser le mot de passe"

### Moyen Terme
- [ ] Permettre de personnaliser le mot de passe par défaut
- [ ] Générer un mot de passe aléatoire sécurisé
- [ ] Créer une page de profil pour le livreur
- [ ] Ajouter une photo de profil

### Long Terme
- [ ] Application mobile dédiée aux livreurs
- [ ] Authentification biométrique
- [ ] Notifications push pour les nouvelles commandes
- [ ] Suivi GPS en temps réel

## Dépannage

### Problème : "Un utilisateur avec cet email existe déjà"
**Cause :** L'email est déjà utilisé par un autre utilisateur  
**Solution :** Utilisez un email différent ou supprimez l'utilisateur existant

### Problème : Le livreur ne peut pas se connecter
**Cause :** Aucun email n'a été fourni lors de la création  
**Solution :** Recréez le livreur avec un email ou créez manuellement un utilisateur

### Problème : Le rôle n'est pas assigné
**Cause :** Aucun rôle "Livreur" ou "Utilisateur" n'existe  
**Solution :** Exécutez le seed ou créez manuellement les rôles

### Problème : Le mot de passe ne fonctionne pas
**Cause :** Le mot de passe a peut-être été changé  
**Solution :** Utilisez la fonction de réinitialisation de mot de passe

## Fichiers Modifiés

```
app/api/delivery-persons/
  └── route.ts (MODIFIÉ)
      ├─ Import bcryptjs
      ├─ Vérification email unique
      ├─ Hashage mot de passe
      ├─ Création utilisateur
      ├─ Assignation rôle
      └─ Retour enrichi avec infos utilisateur
```

## Configuration Requise

### Dépendances
```json
{
  "bcryptjs": "^2.4.3"
}
```

### Variables d'Environnement
Aucune variable supplémentaire requise.

## Support

Pour toute question concernant cette fonctionnalité :
- Code API : `app/api/delivery-persons/route.ts`
- Schéma : `prisma/schema.prisma` (User, DeliveryPerson, Role, UserRole)
- Documentation bcrypt : https://github.com/dcodeIO/bcrypt.js

---

**Mot de passe par défaut : `innotech`**  
⚠️ **À communiquer au livreur lors de la création du compte**
