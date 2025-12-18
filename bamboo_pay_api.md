# 💳 Bamboo Pay – Documentation d’intégration API (Node.js)

> Version : v8  
> Format : Markdown (.md)  
> Authentification : Basic Auth  
> Environnement : Backend (Node.js / Express / NestJS)

---

## 📌 Vue d’ensemble

L’API Bamboo Pay permet aux marchands de :

1. Initier un paiement avec redirection vers la plateforme Bamboo Pay
2. Effectuer un paiement instantané (Mobile Money)
3. Vérifier le statut d’une transaction

Toutes les requêtes sont effectuées en **HTTP POST**, avec des données au format **JSON** et une **authentification Basic Auth**.

---

## 🔐 Authentification

```txt
Username : IDENTIFIANT_MARCHAND
Password : MOT_DE_PASSE
```

Les identifiants sont fournis lors de la création du compte marchand Bamboo Pay.

---

## 🧱 Configuration Axios (Node.js)

```js
import axios from "axios";

export const bambooApi = axios.create({
  baseURL: "https://client.bamboopay-ga.com/api",
  auth: {
    username: process.env.BAMBOO_USERNAME,
    password: process.env.BAMBOO_PASSWORD
  },
  headers: {
    "Content-Type": "application/json"
  }
});
```

---

# A — Paiement avec redirection Bamboo Pay

## 1️⃣ Initier une transaction

### Endpoint

```http
POST /send
```

### Paramètres (Body JSON)

| Champ | Type | Description |
|---|---|---|
| payerName | string | Nom du payeur |
| matricule | string | Matricule client |
| raisonSociale | string | Raison sociale |
| billingId | string | Référence facture côté marchand |
| transactionAmount | string | Montant à payer |
| merchant_id | string | Identifiant marchand |
| phone | string | Téléphone du client |
| return_url | string \| null | URL de retour |
| update_status_url | string \| null | URL webhook de statut |

---

### Exemple Node.js

```js
const response = await bambooApi.post("/send", {
  payerName: "Jean Dupont",
  matricule: "CLT-001",
  raisonSociale: "Entreprise XYZ",
  billingId: "FACT-2025-001",
  transactionAmount: "15000",
  merchant_id: "MERCHANT_123",
  phone: "077000000",
  return_url: "https://mon-site.com/retour",
  update_status_url: "https://mon-site.com/webhook/bamboo"
});

console.log(response.data);
```

---

### Réponse succès

```json
{
  "redirect_url": "https://client.bamboopay-ga.com/pay/XYZ"
}
```

➡️ Rediriger l’utilisateur vers cette URL.

---

## 2️⃣ URL de retour (return_url)

Bamboo Pay ajoute automatiquement les paramètres suivants :

```txt
?status=completed|failed
&ref=TXN-2025-003
```

Exemple :

```
https://mon-site.com/retour?status=completed&ref=TXN-2025-003
```

---

## 3️⃣ Webhook de mise à jour de statut

### Payload envoyé par Bamboo Pay

```json
{
  "billingId": "FACT-2025-001",
  "status": "completed",
  "typePaiement": "airtelMoney",
  "ref": "TXN-2025-003",
  "numCpte": "077000000",
  "observation": "Paiement réussi"
}
```

### Exemple Express.js

```js
app.post("/webhook/bamboo", (req, res) => {
  const { billingId, status } = req.body;

  if (status === "completed") {
    // Mettre à jour la facture / service
  }

  res.sendStatus(200);
});
```

---

# B — Paiement instantané (sans redirection)

### Endpoint

```http
POST /mobile/instant-payment
```

### Paramètres

| Champ | Type |
|---|---|
| phone | string |
| amount | string |
| payer_name | string |
| reference | string |
| merchant_id | string |
| callback_url | string |
| operateur | string \| null |

---

### Exemple Node.js

```js
const response = await bambooApi.post("/mobile/instant-payment", {
  phone: "077000000",
  amount: "5000",
  payer_name: "Jean Dupont",
  reference: "CMD-9001",
  merchant_id: "MERCHANT_123",
  callback_url: "https://mon-site.com/webhook/bamboo",
  operateur: "airtel_money"
});

console.log(response.data);
```

---

### Réponse succès

```json
{
  "reference_bp": "TXN-2025-000381",
  "reference": "CMD-9001",
  "status": true,
  "message": null
}
```

⚠️ Le paiement doit être vérifié via l’API de statut.

---

# C — Vérification du statut d’une transaction

### Endpoint

```http
POST /check-status/{transaction_id}
```

---

### Exemple Node.js

```js
const response = await bambooApi.post(
  "/check-status/TXN-2025-000381"
);

console.log(response.data);
```

---

### Réponse succès

```json
{
  "message": "OK",
  "code": 200,
  "transaction": {
    "status": "completed",
    "code": 200,
    "message": "Statut completed"
  }
}
```

---

## ❌ Gestion des erreurs

| Code | Description |
|---|---|
| 401 | Identifiants invalides |
| 401 | Accès API non autorisé |
| 422 | merchant_id invalide |
| 404 | Transaction inexistante |
| 500 | Erreur interne Bamboo Pay |

---

## 🧠 Bonnes pratiques

- Toujours passer par le backend
- Sécuriser les webhooks (token, IP whitelist)
- Vérifier systématiquement le statut côté serveur
- Ne pas se fier uniquement au retour frontend

---

## 📎 Variables d’environnement

```env
BAMBOO_USERNAME=xxxx
BAMBOO_PASSWORD=xxxx
BAMBOO_MERCHANT_ID=xxxx
```

---

© Bamboo Pay – Documentation technique

