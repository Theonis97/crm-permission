# Documentation Intégration MoneyFusion

Cette documentation détaille l'implémentation du système de paiement mobile **MoneyFusion** au sein de l'ERP INTECH.

## Vue d'ensemble

L'intégration MoneyFusion permet d'accepter des paiements via Mobile Money. Le système gère l'initiation du paiement, la redirection du client vers l'interface de paiement sécurisée, et la confirmation asynchrone via des webhooks.

## Configuration

Pour fonctionner, l'intégration nécessite la variable d'environnement suivante dans le fichier `.env` :

```env
# URL d'initiation fournie par MoneyFusion (avec le token partenaire)
MONEY_FUSION_PAYMENT_URL="https://www.pay.moneyfusion.net/PayLink/xxxxxx/pay/"

# URL de l'application pour les retours et webhooks
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"
```

## Architecture Technique

L'implémentation est répartie sur plusieurs fichiers clés :

### 1. Bibliothèque de Base (`lib/moneyfusion.ts`)

Gère la logique de communication avec l'API MoneyFusion.

- **Calcul des frais** : Une commission est appliquée. La fonction `calculateAmountToSend` ajuste le montant en fonction du taux `MONEY_FUSION_FEE_RATE` (actuellement 1.08).
- **`initiatePayment`** : Envoie les données de transaction (montant, articles, info client) à MoneyFusion.
- **`checkPaymentStatus`** : Permet de vérifier manuellement le statut d'une transaction via son token.

### 2. Routes API

#### Initiation du Paiement (`POST /api/payments/moneyfusion`)

Appelée par le frontend (ex: POS) pour démarrer une transaction.

- **Entrées** : `amount`, `phone`, `customerName`, `items`, `metadata`.
- **Sortie** : Une URL de redirection et un token de transaction.

#### Vérification de Statut (`GET /api/payments/moneyfusion?token=xxx`)

Permet au frontend de vérifier si un paiement est passé sans attendre le webhook.

#### Webhook (`POST /api/webhooks/moneyfusion`)

Endpoint public appelé par les serveurs de MoneyFusion pour confirmer le paiement.

- Reçoit le `tokenPay` et le `statut`.
- Met à jour l'état de la commande dans la base de données.

## Workflow de Paiement

1. **Initiation** : L'utilisateur valide une vente dans le POS.
2. **Calcul** : Le système calcule le montant net à envoyer après déduction des frais.
3. **Redirection** : L'utilisateur est redirigé vers l'URL retournée par MoneyFusion.
4. **Paiement** : Le client finalise la transaction sur son mobile.
5. **Notification** : MoneyFusion appelle le Webhook pour confirmer le succès.
6. **Finalisation** : L'ERP marque la commande comme payée et redirige l'utilisateur vers le tableau de bord.

## 🛠 Développement Local (Webhooks)

Pour tester les webhooks en local, il est impératif d'utiliser un tunnel comme **ngrok** :

1. Lancer ngrok : `ngrok http 3000`
2. Copier l'URL HTTPS générée.
3. Mettre à jour `NEXT_PUBLIC_APP_URL` dans le `.env`.
4. S'assurer que cette URL est bien enregistrée comme URL de webhook dans votre portail partenaire MoneyFusion.

## Notes Importantes

- **Frais** : Le taux de frais actuel est fixé à `1.08` (soit ~8%) dans `lib/moneyfusion.ts`.
- **Sécurité** : Les routes API (hors webhook) sont protégées par une session NextAuth.
- **Logging** : Toutes les requêtes webhook sont logguées avec le préfixe `[MoneyFusion Webhook]` pour faciliter le debugging.
