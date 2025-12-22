# Intégration MyPVit - Documentation Technique

Ce document détaille l'intégration du service de paiement mobile **MyPVit** dans le CRM Sambatech.

## Structure des Fichiers

*   **`lib/mypvit.ts`** : Contient la classe `MyPvit` et les interfaces de typage.
*   **`test-mypvit.ts`** : Script de test pour valider les fonctionnalités (renouvellement de clé, paiement, statut).

## Classe `MyPvit`

La classe `MyPvit` encapsule la logique de communication avec l'API v2 de MyPVit.

### Initialisation

```typescript
const mypvit = new MyPvit('VOTRE_CODE_URL');
```

*   `codeUrl` : L'identifiant unique de l'URL fourni par MyPVit (ex: `8T4UNT1OHIMZLJXC`).

### Méthodes

#### 1. `renewSecret`

Renouvelle la clé secrète `X-Secret` nécessaire pour authentifier les autres requêtes.

*   **Signature** : `renewSecret(operationAccountCode: string, password: string): Promise<RenewSecretResponse>`
*   **Paramètres** :
    *   `operationAccountCode` : Code du compte d'opération (ex: `ACC_PROD_001`).
    *   `password` : Mot de passe du compte.
*   **Retour** : `RenewSecretResponse` contenant la nouvelle clé `secret` et son expiration.

#### 2. `initiatePayment`

Initie une demande de paiement mobile (Push USSD).

*   **Signature** : `initiatePayment(secret: string, data: PaymentRequest): Promise<PaymentResponse>`
*   **Paramètres** :
    *   `secret` : La clé obtenue via `renewSecret`.
    *   `data` : Objet `PaymentRequest` contenant les détails du paiement (montant, référence, numéro client, opérateur, etc.).
*   **Note** : Le montant doit être supérieur à 500 XAF.

#### 3. `checkStatus`

Vérifie le statut d'une transaction.

*   **Signature** : `checkStatus(secret: string, transactionId: string, accountOperationCode: string, transactionOperation: 'PAYMENT' | 'GIVE_CHANGE', statusCodeUrl?: string): Promise<PaymentStatusResponse>`
*   **Paramètres** :
    *   `transactionId` : La référence marchande de la transaction.
    *   `accountOperationCode` : Le code du compte d'opération.
    *   `transactionOperation` : Type de transaction (`PAYMENT`).
    *   `statusCodeUrl` : (Optionnel) Code URL spécifique pour la vérification de statut si différent du code principal (ex: `YQJCR6PJP9JGIUCK`).

## Types et Interfaces

### `PaymentRequest`

```typescript
interface PaymentRequest {
  amount: number;                // Montant (> 500)
  reference: string;             // Réf unique (max 15 chars)
  customer_account_number: string; // Numéro client (ex: 074...)
  merchant_operation_account_code: string;
  transaction_type: 'PAYMENT' | 'GIVE_CHANGE';
  operator_code: 'AIRTEL_MONEY' | 'MOOV_MONEY';
  callback_url_code: string;     // Code URL pour le callback
  free_info?: string;            // Info libre (max 15 chars)
  // ... autres champs optionnels
}
```

### `PaymentResponse`

```typescript
interface PaymentResponse {
  status: 'PENDING' | 'FAILED' | 'SUCCESS';
  status_code: string;
  reference_id: string;          // Réf MyPVit
  merchant_reference_id: string; // Votre réf
  message: string;
  // ...
}
```

## Gestion des Erreurs

La classe gère les erreurs API courantes :

*   **400 (Bad Request)** : Données invalides (ex: référence trop longue, montant insuffisant). Les messages de validation sont inclus dans l'erreur.
*   **401 (Authentication Failed)** : Clé secrète expirée ou invalide.
*   **403 (Forbidden)** : URL non active.

Les erreurs sont levées sous forme d'exceptions JS avec le code d'erreur et le message descriptif renvoyé par l'API.

## Exemple d'Utilisation

```typescript
import { MyPvit } from './lib/mypvit';

async function main() {
  const client = new MyPvit('CODE_URL_PRINCIPAL');
  
  // 1. Authentification
  const auth = await client.renewSecret('ACC_CODE', 'PASSWORD');
  
  // 2. Paiement
  const payment = await client.initiatePayment(auth.secret, {
    amount: 1000,
    reference: 'REF123',
    customer_account_number: '070000000',
    operator_code: 'AIRTEL_MONEY',
    // ...
  });
  
  // 3. Vérification Statut
  const status = await client.checkStatus(
    auth.secret, 
    'REF123', 
    'ACC_CODE', 
    'PAYMENT',
    'CODE_URL_STATUS' // Si différent
  );
}
```
