# Formulaire Multi-Étapes pour le POS - Finaliser la Commande

## Vue d'ensemble

Le modal "Finaliser la commande" du POS a été transformé en un formulaire multi-étapes avec 3 étapes distinctes :

### 🎯 Étape 1 : Client
- **Recherche de client existant** : Autocomplete avec recherche par nom, téléphone ou email
- **Sélection d'un client** : Clic sur un client pour pré-remplir le formulaire
- **Création d'un nouveau client** : 
  - Prénom
  - Nom
  - Téléphone (requis)
  - Email (optionnel)
- Le client est automatiquement créé dans la table `contacts` s'il n'existe pas

### 🚚 Étape 2 : Livraison
- **Autocomplétion d'adresse OpenStreetMap** :
  - Champ avec autocomplétion en temps réel (debounce 500ms)
  - Utilise l'API Nominatim (OpenStreetMap) pour suggérer des adresses
  - Dropdown avec 5 suggestions max
  - Affichage des détails (rue, quartier, ville)
  - Fermeture automatique au clic extérieur
  
- **Détection automatique de la zone de livraison** :
  - Algorithme point-in-polygon pour identifier la zone correspondante
  - Affiche les informations de la zone (nom, frais, temps estimé)
  - Alerte si l'adresse est hors des zones configurées
  - Sélection automatique du livreur assigné à la zone
  
- **Configuration manuelle** :
  - Sélection du livreur
  - Modification des frais de livraison

### 💳 Étape 3 : Paiement
- **Mode de paiement** : Espèces, Carte, Mobile Money
- **Notes** : Instructions spéciales pour la commande
- **Récapitulatif complet** :
  - Informations client
  - Adresse de livraison
  - Zone détectée
  - Montants détaillés (sous-total, TVA, livraison, total)

## 🎨 Interface

### Indicateur de progression
- Barre de progression visuelle avec 3 étapes
- Étapes complétées marquées d'une coche verte
- Étape actuelle en bleu
- Étapes futures en gris

### Navigation
- **Footer fixe** avec boutons toujours visibles
- Bouton "Précédent" pour revenir en arrière
- Bouton "Suivant" avec validation (désactivé si champs requis manquants)
- Bouton "Créer la commande" à la dernière étape (vert)
- Bouton "Annuler" à la première étape

### Validation
- Étape 1 → 2 : Téléphone requis
- Étape 2 → 3 : Adresse + géolocalisation requises
- Étape 3 → Création : Tous les champs précédents validés

## 🔧 Modifications techniques

### Frontend (`app/dashboard/stores/[id]/pos/page.tsx`)

**Nouveaux états :**
```typescript
const [checkoutStep, setCheckoutStep] = useState(1)
const [contacts, setContacts] = useState<any[]>([])
const [deliveryZones, setDeliveryZones] = useState<any[]>([])
const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
const [contactSearch, setContactSearch] = useState("")
const [deliveryAddress, setDeliveryAddress] = useState("")
const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
const [loadingAddresses, setLoadingAddresses] = useState(false)
const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null)
const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null)
const [detectedZone, setDetectedZone] = useState<any>(null)
```

**Refs :**
```typescript
const addressDropdownRef = useRef<HTMLDivElement>(null)
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
```

**Nouvelles fonctions :**
- `loadContacts()` - Charge tous les contacts
- `loadDeliveryZones()` - Charge les zones de livraison du magasin
- `handleSelectContact(contact)` - Sélectionne un client existant
- `handleAddressSearch(query)` - Recherche d'adresses avec debouncing (500ms)
- `handleSelectAddress(suggestion)` - Sélectionne une adresse et détecte la zone automatiquement
- `detectDeliveryZone(lat, lng)` - Détecte la zone par coordonnées
- `isPointInPolygon(lat, lng, polygon)` - Algorithme point-in-polygon
- `canProceedToStep2()` - Validation étape 1
- `canProceedToStep3()` - Validation étape 2
- `resetCheckoutForm()` - Réinitialise tous les champs

**Hooks useEffect :**
- Fermeture du dropdown d'adresses au clic extérieur
- Nettoyage du timer de debounce

**Modifications de `handleCreateOrder()` :**
- Crée automatiquement le contact dans la table `users` si nécessaire
- Envoie `contactId`, `deliveryLatitude`, `deliveryLongitude`, `deliveryZoneId`
- Appelle l'API `/api/store-orders` au lieu de `/api/orders`

### Backend (`app/api/store-orders/route.ts`)

**Modifications POST :**
- Ajout du paramètre `contactId` 
- Support pour `deliveryLatitude`, `deliveryLongitude`, `deliveryZoneId`
- Ajout de l'inclusion du `contact` dans la réponse

**Modifications GET :**
- Ajout de l'inclusion du `contact` dans les résultats

## 📊 Schéma de données

### StoreOrder
```prisma
model StoreOrder {
  contactId         String? // Lien vers Contact (optionnel)
  customerName      String  // Nom snapshot
  customerPhone     String  // Téléphone snapshot
  customerEmail     String? // Email snapshot
  deliveryAddress   String?
  deliveryLatitude  Float?  // ✨ Nouveau
  deliveryLongitude Float?  // ✨ Nouveau
  deliveryZoneId    String? // ✨ Lié à DeliveryZone
  deliveryPersonId  String? // Livreur assigné
  deliveryFee       Float
  ...
}
```

## 🚀 Workflow complet

1. **Ajout de produits au panier** → Clic "Valider la commande"
2. **Étape 1 - Client**
   - Recherche d'un client existant OU
   - Saisie des informations d'un nouveau client
   - Validation : téléphone requis
3. **Étape 2 - Livraison (✨ Autocomplétion)**
   - L'utilisateur commence à taper une adresse (min. 3 caractères)
   - Après 500ms (debounce), appel à l'API Nominatim
   - Affichage de 5 suggestions dans un dropdown
   - Clic sur une suggestion :
     - ✅ Adresse complète remplie
     - ✅ Coordonnées GPS extraites (lat, lng)
     - ✅ Détection automatique de la zone (algorithme point-in-polygon)
     - ✅ Frais de livraison mis à jour
     - ✅ Livreur de la zone sélectionné automatiquement
     - ✅ Toast de confirmation ou warning si hors zone
   - Configuration manuelle possible (livreur, frais)
4. **Étape 3 - Paiement**
   - Choix du mode de paiement
   - Notes optionnelles
   - Récapitulatif complet
5. **Création de la commande**
   - Création du contact si nouveau
   - Création de la commande dans `store_orders`
   - Mise à jour des stocks
   - Toast de confirmation

## 🔄 Workflow de l'autocomplétion d'adresse

```
User tape "Rue de la Réunification"
    ↓ (après 500ms de pause)
API Nominatim (/search?q=Rue+de+la+Réunification&countrycodes=cm)
    ↓
5 suggestions retournées
    ↓
User clique sur "Rue de la Réunification, Bonanjo, Douala"
    ↓
    ├─ setDeliveryAddress(suggestion.display_name)
    ├─ setDeliveryLatitude(suggestion.lat)
    ├─ setDeliveryLongitude(suggestion.lon)
    └─ detectDeliveryZone(lat, lng)
           ↓
           ├─ Boucle sur toutes les zones
           ├─ isPointInPolygon(lat, lng, zone.coordinates)
           └─ Si trouvé:
               ├─ setDetectedZone(zone)
               ├─ setDeliveryFee(zone.deliveryFee)
               ├─ setSelectedDeliveryPerson(zone.deliveryPersonId)
               └─ toast.success("Zone détectée: ...")
```

## 🎨 Améliorations UX

- ✅ Interface intuitive avec indicateur de progression
- ✅ Validation en temps réel des étapes
- ✅ **Autocomplétion d'adresse fluide** (debouncing, loading spinner)
- ✅ **Détection automatique de zone instantanée** dès la sélection
- ✅ Feedback visuel (zones détectées, géolocalisation confirmée)
- ✅ Recherche de clients rapide
- ✅ Footer fixe pour navigation facile
- ✅ Dropdown cliquable à l'extérieur pour fermer
- ✅ Réinitialisation automatique après création
- ✅ Messages d'erreur clairs et informatifs
- ✅ Design moderne et responsive

## ⚡ Optimisations de performance

1. **Debouncing (500ms)** : Évite les appels API excessifs pendant la frappe
2. **Limite de 5 suggestions** : Réduit la charge et améliore la lisibilité
3. **Filtrage par pays** (`countrycodes=cm`) : Résultats plus pertinents et rapides
4. **Cleanup des timers** : Évite les fuites mémoires
5. **Fermeture au clic extérieur** : Meilleure gestion de l'état

## 🔍 API utilisées

### Géocodage et Autocomplétion
- **Nominatim (OpenStreetMap)** : `https://nominatim.openstreetmap.org/search`
- **Paramètres utilisés** :
  - `format=json` - Format de réponse
  - `q=<query>` - Texte de recherche
  - `limit=5` - Nombre max de résultats
  - `addressdetails=1` - Inclut les détails d'adresse (rue, quartier, ville)
  - `countrycodes=cm` - Limite au Cameroun (modifiable)
  - `Accept-Language: fr` - Résultats en français
- **Gratuit, sans clé API**
- **Rate limit** : 1 requête/seconde (respecté via debouncing)
- **Retourne** : lat, lon, display_name, address{road, suburb, city, etc.}

### Endpoints internes
- `GET /api/contacts` - Liste des clients
- `POST /api/contacts` - Création de client
- `GET /api/delivery-zones?storeId=xxx` - Zones du magasin
- `POST /api/store-orders` - Création de commande

## 📝 Notes importantes

1. **Nominatim** a une politique d'utilisation équitable (max 1 req/sec)
2. Les **coordonnées de zone** sont stockées au format `[{lat, lng}, ...]`
3. L'algorithme **point-in-polygon** fonctionne pour les polygones simples (non auto-intersectants)
4. Le **contact est optionnel** - une commande peut être créée sans contact lié
5. Les **frais de livraison** sont automatiquement mis à jour selon la zone détectée

## 🐛 Points d'attention

- Vérifier que les zones de livraison ont des polygones valides
- S'assurer que les livreurs sont actifs et disponibles
- Tester avec différentes adresses (dans/hors zones)
- Gérer le cas où Nominatim ne trouve pas l'adresse
- Prévoir un fallback si la géolocalisation échoue
- Le debouncing peut être ajusté (actuellement 500ms)
- Le `countrycodes` peut être changé selon votre pays cible

## ⚙️ Configuration

### Modifier le pays cible
Dans `handleAddressSearch()`, ligne 357 :
```typescript
`countrycodes=cm`, // Cameroun
```

Changez `cm` par le code ISO de votre pays :
- `cm` - Cameroun
- `fr` - France
- `be` - Belgique
- `ci` - Côte d'Ivoire
- etc.

### Ajuster le debounce
Dans `handleAddressSearch()`, ligne 375 :
```typescript
}, 500) // Délai de 500ms
```

Modifiez selon vos besoins (300-1000ms recommandé).

### Nombre de suggestions
Dans `handleAddressSearch()`, ligne 355 :
```typescript
`limit=5&` // 5 suggestions max
```

Augmentez ou réduisez selon vos besoins.

## 🧪 Tests recommandés

1. **Autocomplétion** :
   - Taper moins de 3 caractères → Aucune recherche
   - Taper 3+ caractères → Affichage du loader
   - Attendre 500ms → Affichage des suggestions
   - Cliquer sur une suggestion → Adresse remplie + zone détectée
   - Cliquer à l'extérieur → Dropdown fermé

2. **Détection de zone** :
   - Adresse dans une zone configurée → Zone détectée + frais + livreur
   - Adresse hors zone → Warning affiché
   - Adresse avec plusieurs zones → Première zone trouvée

3. **Navigation** :
   - Bouton "Suivant" désactivé si champs requis vides
   - Bouton "Précédent" pour revenir en arrière
   - Annulation → Réinitialisation complète

4. **Performance** :
   - Taper rapidement → 1 seul appel API (debounce)
   - Fermeture/ouverture rapide du modal → Pas de fuite mémoire
