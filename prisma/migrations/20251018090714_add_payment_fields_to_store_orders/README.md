# Migration: Add Payment Fields to Store Orders

**Date:** 2025-10-18  
**Migration ID:** 20251018090714_add_payment_fields_to_store_orders

## Description

Cette migration ajoute deux nouveaux champs à la table `store_orders` pour améliorer la gestion des paiements en espèces dans l'application Inotech Driver.

## Champs ajoutés

### `amount_received` (DOUBLE PRECISION, nullable)
- **Description:** Montant effectivement reçu du client lors de la livraison
- **Type:** Float optionnel
- **Usage:** Permet de saisir le montant exact donné par le client

### `change_given` (DOUBLE PRECISION, nullable)
- **Description:** Monnaie rendue au client
- **Type:** Float optionnel  
- **Usage:** Calculé automatiquement comme `max(0, amount_received - total)`

## Impact

- ✅ **Compatibilité:** Les champs sont optionnels, donc compatibles avec les commandes existantes
- ✅ **Fonctionnalité:** Permet la gestion précise des paiements en espèces
- ✅ **Calcul automatique:** La monnaie est calculée côté backend
- ✅ **Traçabilité:** Historique complet des transactions

## Utilisation

Ces champs sont utilisés par l'API `/api/delivery/orders/[orderId]/deliver` lors de la confirmation de livraison par les livreurs via l'application mobile.

## Rollback

Pour annuler cette migration :
```sql
ALTER TABLE "store_orders" 
DROP COLUMN "amount_received",
DROP COLUMN "change_given";
```
