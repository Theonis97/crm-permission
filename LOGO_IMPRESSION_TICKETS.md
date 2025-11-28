# Logo sur les tickets d'impression - CRM Sambatech

## 🎯 Fonctionnalité ajoutée

### Support du logo du magasin sur les tickets
Le système d'impression thermique prend maintenant en charge l'affichage du logo du magasin sur tous les tickets (ventes et clôtures de journée).

## 🏗️ Architecture technique

### Base de données
Le modèle `Store` contient déjà un champ `logo` optionnel :
```prisma
model Store {
  id    String  @id @default(cuid())
  name  String
  logo  String? // URL ou chemin vers le logo
  // ... autres champs
}
```

### Interface TicketData
Ajout du champ `storeLogo` dans l'interface :
```typescript
export interface TicketData {
  // Informations du magasin
  storeName: string
  storeAddress?: string
  storePhone?: string
  storeLogo?: string // 🆕 Nouveau champ
  
  // ... autres champs
}
```

## 🎨 Affichage du logo

### Sur les tickets texte (imprimantes thermiques)
Pour les imprimantes thermiques ESC/POS, le logo est représenté par un indicateur textuel :
```
================================
        *** LOGO ***

    NOM DU MAGASIN
   Adresse du magasin
    TEL: 074813493
================================
```

### Sur l'impression HTML (prévisualisation/web)
Pour l'impression web et la prévisualisation, le logo est affiché comme une image :
```html
<div style="text-align: center; margin-bottom: 10px;">
  <img src="URL_DU_LOGO" alt="Logo" 
       style="max-width: 50mm; max-height: 20mm; object-fit: contain;" />
</div>
```

#### Dimensions recommandées
- **Largeur maximale** : 50mm (45mm en impression)
- **Hauteur maximale** : 20mm (18mm en impression)
- **Format** : PNG, JPG, SVG
- **Résolution** : 300 DPI pour une qualité optimale

## ⚙️ Configuration

### Paramètre showLogo
Le logo peut être activé/désactivé via les paramètres d'imprimante :
```typescript
interface PrinterSettings {
  // ... autres paramètres
  showLogo: boolean // Active/désactive l'affichage du logo
}
```

### Contrôle dans l'interface
L'option `showLogo` est disponible dans le dialog des paramètres d'imprimante, permettant à l'utilisateur de choisir d'afficher ou non le logo sur les tickets.

## 🔄 Logique d'affichage

### Conditions d'affichage
Le logo s'affiche uniquement si :
1. **Le magasin a un logo** : `storeInfo?.logo` existe
2. **L'option est activée** : `printerSettings.showLogo === true`

### Code de génération
```typescript
// Pour les tickets de vente
storeLogo: (printerSettings.showLogo && storeInfo?.logo) ? storeInfo.logo : undefined

// Pour les tickets de clôture
storeLogo: (settings.showLogo && storeInfo?.logo) ? storeInfo.logo : undefined
```

## 📋 Types de tickets supportés

### 1. Tickets de vente
- Logo affiché en en-tête
- Respecte le paramètre `showLogo` de l'utilisateur
- Utilise le logo du magasin depuis `storeInfo`

### 2. Tickets de clôture de journée
- Logo affiché en en-tête
- Respecte le paramètre `showLogo` sauvegardé
- Même source que les tickets de vente

### 3. Tickets de test d'impression
- Logo inclus si l'option est activée
- Permet de tester l'affichage avant utilisation

## 🎯 Avantages

### Pour le magasin
- ✅ **Image de marque** : Logo visible sur tous les reçus
- ✅ **Professionnalisme** : Tickets plus élégants et reconnaissables
- ✅ **Marketing** : Renforcement de l'identité visuelle
- ✅ **Différenciation** : Tickets uniques par rapport à la concurrence

### Pour les clients
- ✅ **Reconnaissance** : Identification immédiate du magasin
- ✅ **Confiance** : Aspect plus professionnel des reçus
- ✅ **Mémorisation** : Meilleure mémorisation de la marque

## 🔧 Configuration technique

### Upload du logo
Le logo doit être uploadé dans le système de gestion des magasins et l'URL stockée dans le champ `logo` du modèle `Store`.

### Formats supportés
- **Images web** : PNG, JPG, GIF, SVG
- **Taille recommandée** : Maximum 200KB
- **Dimensions** : Ratio 2:1 ou 3:1 (largeur:hauteur)

### Optimisation pour l'impression
- **Résolution** : 300 DPI minimum
- **Contraste** : Bon contraste pour impression monochrome
- **Simplicité** : Éviter les détails trop fins

## 🖨️ Compatibilité imprimantes

### Imprimantes thermiques ESC/POS
- **Support texte** : Indicateur "*** LOGO ***"
- **Support image** : Dépend du modèle d'imprimante
- **Formats** : Principalement monochrome

### Impression web/PDF
- **Support complet** : Affichage de l'image réelle
- **Couleurs** : Support couleur complet
- **Qualité** : Haute résolution

## 📱 Interface utilisateur

### Paramètres d'imprimante
L'option logo est disponible dans la section "Personnalisation du ticket" :
```
┌─────────────────────────────────┐
│ Personnalisation du ticket      │
│                                 │
│ ☑️ Afficher le logo du magasin   │
│ ☑️ Détails de TVA               │
│ ☐ Codes SKU des articles        │
│                                 │
└─────────────────────────────────┘
```

### Aperçu en temps réel
L'aperçu du ticket dans les paramètres montre le logo si l'option est activée et si le magasin a un logo configuré.

## 🔍 Tests et validation

### Scénarios de test
1. **Magasin avec logo + option activée** → Logo affiché
2. **Magasin avec logo + option désactivée** → Pas de logo
3. **Magasin sans logo + option activée** → Pas de logo
4. **Magasin sans logo + option désactivée** → Pas de logo

### Points de contrôle
- ✅ Affichage correct dans l'aperçu
- ✅ Impression web avec image
- ✅ Impression thermique avec indicateur
- ✅ Respect des paramètres utilisateur
- ✅ Performance (pas de ralentissement)

## 🚀 Évolutions futures

### Améliorations possibles
- **Upload direct** : Interface pour uploader le logo depuis les paramètres
- **Redimensionnement auto** : Optimisation automatique des dimensions
- **Formats avancés** : Support des logos vectoriels (SVG)
- **Positionnement** : Options de placement du logo (haut, bas, côté)

### Intégrations
- **Gestion des assets** : Système de gestion centralisé des logos
- **Multi-logos** : Support de logos différents par type de ticket
- **Personnalisation** : Logos spécifiques par caissier ou période

## 📊 Exemple d'utilisation

### Configuration du magasin
```json
{
  "id": "store_123",
  "name": "DERRIÈRE LA STATION DE BESSIEUX",
  "address": "Libreville, Gabon",
  "phone": "074813493",
  "logo": "https://example.com/logos/store_123.png"
}
```

### Paramètres d'impression
```json
{
  "showLogo": true,
  "storeName": "DERRIÈRE LA STATION DE BESSIEUX",
  "storeAddress": "Libreville, Gabon",
  "storePhone": "074813493"
}
```

### Ticket généré
```
================================
        *** LOGO ***

DERRIÈRE LA STATION DE BESSIEUX
    Libreville, Gabon
    TEL: 074813493
================================

Date: 28/11/2025 12:30
Ticket: POS-251128-123045
Caissier: MAELLA IVANGUI
Client: Amissa

--------------------------------
QTE DESIGNATION        TOTAL
--------------------------------
  1 BATTEUSE ELECTRIQUE  6000 F

================================
TOTAL:                  6000 F
================================

Mode de paiement: Espèces

Merci de votre visite!
A bientôt
```

---

*Fonctionnalité implémentée le 28 novembre 2025*
