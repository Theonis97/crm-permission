# Guide d'impression de tickets thermiques - CRM Sambatech

## 🎯 Vue d'ensemble

Le système d'impression de tickets thermiques permet d'imprimer automatiquement des reçus de vente directement depuis le POS du magasin. Il est compatible avec les imprimantes thermiques standard (ESC/POS) de 58mm et 80mm.

## 🏗️ Architecture

### Composants principaux

1. **ThermalPrinterService** (`/lib/thermal-printer.ts`)
   - Service singleton pour la gestion de l'impression
   - Génération du contenu du ticket au format texte
   - Interface avec l'API Web Print du navigateur

2. **ThermalPrinterDialog** (`/components/pos/thermal-printer-dialog.tsx`)
   - Interface utilisateur pour l'impression
   - Prévisualisation du ticket avant impression
   - Gestion des erreurs d'impression

3. **PrinterSettingsDialog** (`/components/pos/printer-settings-dialog.tsx`)
   - Configuration personnalisée des paramètres d'impression
   - Sauvegarde locale des préférences
   - Aperçu en temps réel des modifications

## 🚀 Utilisation

### Impression automatique
Après une vente réussie dans le POS, le système :
1. Génère automatiquement les données du ticket
2. Vérifie les paramètres d'impression automatique
3. Imprime directement ou affiche le dialog selon la configuration

### Impression manuelle
- **Bouton "Test d'impression"** : Permet de tester l'impression avec le contenu actuel du panier
- **Dialog d'impression** : Affiche un aperçu détaillé avant impression
- **Bouton "Prévisualiser"** : Ouvre une nouvelle fenêtre avec le ticket formaté

### Configuration d'imprimante
Accessible via l'icône ⚙️ dans le header du panier :
- Informations du magasin (nom, adresse, téléphone)
- Paramètres d'impression (largeur papier, copies, impression automatique)
- Personnalisation du contenu (TVA, SKU, message de fin)
- Aperçu en temps réel des modifications

## 📋 Format du ticket

Le ticket généré inclut :

```
================================
         NOM DU MAGASIN
      Adresse du magasin
       TEL: 074813493
================================

Date: 28/11/2025 11:22
Ticket: POS-251128-112245123
Caissier: Nom du caissier
Client: Nom du client
Tel: 066975825

--------------------------------
QTE DESIGNATION        TOTAL
--------------------------------
  1 BATTEUSE ELECTRIQUE  6000 F
    SKU: BATT001 (si activé)
    Remise: -10% (si applicable)

--------------------------------
Sous-total:             6000 F
Remise:                 -600 F
TVA:                     540 F
================================
TOTAL:                  5940 F
================================

Mode de paiement: Espèces
Reçu:                   6000 F
Rendu:                    60 F

Notes: Vente directe POS

Merci de votre visite!
A bientôt
```

## ⚙️ Configuration

### Paramètres disponibles

#### Informations du magasin
- **Nom du magasin** : Affiché en en-tête du ticket
- **Adresse** : Adresse complète du magasin
- **Téléphone** : Numéro de contact

#### Paramètres d'impression
- **Largeur du papier** : 58mm (standard) ou 80mm (large)
- **Impression automatique** : Active/désactive l'impression automatique après vente
- **Nombre de copies** : 1 à 5 copies par impression

#### Contenu du ticket
- **Détails de TVA** : Afficher/masquer le calcul de la TVA
- **Codes SKU** : Afficher/masquer les références produits
- **Décimales** : Afficher/masquer les centimes dans les prix
- **Message de fin** : Message personnalisé en bas du ticket

### Sauvegarde des paramètres
Les paramètres sont sauvegardés localement dans le navigateur par magasin :
- Clé de stockage : `printer-settings-{storeId}`
- Format : JSON dans localStorage
- Rechargement automatique à l'ouverture

## 🖨️ Compatibilité imprimantes

### Imprimantes supportées
- **Format** : ESC/POS standard
- **Largeurs** : 58mm et 80mm
- **Connexion** : USB, Bluetooth, WiFi (selon le navigateur)

### Configuration système
1. **Windows** : Installer les drivers de l'imprimante
2. **macOS** : Ajouter l'imprimante dans Préférences Système
3. **Linux** : Configurer CUPS pour l'imprimante

### Test d'impression
Utilisez le bouton "Test d'impression" pour vérifier :
- La connexion à l'imprimante
- Le formatage du ticket
- La qualité d'impression

## 🔧 Dépannage

### Problèmes courants

#### L'impression ne fonctionne pas
1. Vérifier que l'imprimante est allumée et connectée
2. Contrôler les drivers d'imprimante
3. Tester avec le bouton "Prévisualiser" d'abord
4. Vérifier les paramètres du navigateur (popup bloqués)

#### Le formatage est incorrect
1. Vérifier la largeur du papier dans les paramètres
2. Ajuster la largeur dans la configuration (58mm vs 80mm)
3. Tester avec différents navigateurs

#### L'impression automatique ne fonctionne pas
1. Vérifier que l'option est activée dans les paramètres
2. Contrôler les autorisations du navigateur pour l'impression
3. Utiliser l'impression manuelle en fallback

### Messages d'erreur

- **"Impression non supportée"** : Le navigateur ne supporte pas l'API Print
- **"Impossible d'ouvrir la fenêtre"** : Popup bloqué par le navigateur
- **"Erreur lors de l'impression"** : Problème de connexion à l'imprimante

## 📱 Navigateurs supportés

### Compatibilité
- ✅ **Chrome/Chromium** : Support complet
- ✅ **Firefox** : Support complet
- ✅ **Safari** : Support partiel (macOS/iOS)
- ✅ **Edge** : Support complet
- ❌ **Internet Explorer** : Non supporté

### Recommandations
- Utiliser Chrome ou Firefox pour une meilleure compatibilité
- Autoriser les popups pour le domaine de l'application
- Configurer l'imprimante par défaut dans le système

## 🎨 Personnalisation

### Modification du format
Pour personnaliser le format du ticket, modifier :
- `ThermalPrinterService.generateTicketContent()` dans `/lib/thermal-printer.ts`
- Ajuster la largeur de colonne (variable `width`)
- Modifier les fonctions utilitaires (`centerText`, `rightAlign`, `itemLine`)

### Ajout de nouveaux champs
1. Étendre l'interface `TicketData`
2. Modifier `generateTicketData()` dans la page POS
3. Mettre à jour `generateTicketContent()` pour inclure les nouveaux champs

### Styles d'impression
Modifier les styles CSS dans `printTicket()` pour :
- Changer la police d'impression
- Ajuster les marges et espacements
- Personnaliser l'apparence du ticket

## 📊 Exemple d'utilisation

```typescript
import { thermalPrinter, type TicketData } from '@/lib/thermal-printer'

// Créer les données du ticket
const ticketData: TicketData = {
  storeName: "DERRIÈRE LA STATION DE BESSIEUX",
  storeAddress: "Libreville, Gabon",
  storePhone: "074813493",
  ticketNumber: "179385",
  date: new Date(),
  cashier: "MAELLA IVANGUI",
  items: [{
    name: "BATTEUSE ELECTRIQUE",
    quantity: 1,
    unitPrice: 6000,
    total: 6000
  }],
  subtotal: 6000,
  tax: 0,
  discount: 0,
  total: 6000,
  paymentMethod: "CASH"
}

// Imprimer le ticket
try {
  await thermalPrinter.printTicket(ticketData)
  console.log('Ticket imprimé avec succès')
} catch (error) {
  console.error('Erreur d\'impression:', error)
}
```

## 🔄 Évolutions futures

### Fonctionnalités prévues
- **Impression de codes-barres** : QR codes et codes-barres sur les tickets
- **Templates personnalisés** : Modèles de tickets prédéfinis
- **Impression réseau** : Support des imprimantes réseau
- **Historique d'impression** : Log des tickets imprimés
- **Réimpression** : Possibilité de réimprimer d'anciens tickets

### Intégrations possibles
- **Imprimantes spécialisées** : Support d'imprimantes spécifiques
- **Services cloud** : Impression via services externes
- **Mobile** : Impression depuis applications mobiles
- **API externe** : Intégration avec systèmes tiers

## 📞 Support

Pour toute question ou problème :
1. Consulter ce guide en premier
2. Tester avec le bouton "Test d'impression"
3. Vérifier les paramètres d'imprimante
4. Contacter le support technique si nécessaire

---

*Guide créé le 28 novembre 2025 - Version 1.0*
