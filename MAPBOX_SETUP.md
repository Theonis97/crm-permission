# Configuration Mapbox Geocoding API

## 🚀 Étapes d'installation

### 1. Créer un compte Mapbox (GRATUIT)

1. Aller sur **https://account.mapbox.com/auth/signup/**
2. Créer un compte gratuit (email + mot de passe)
3. Pas besoin de carte bancaire pour le plan gratuit

### 2. Récupérer la clé API

1. Une fois connecté, aller sur **https://account.mapbox.com/**
2. Dans la section "Access tokens", copier votre **Default public token**
3. Ou créer un nouveau token avec les permissions :
   - ✅ `styles:read`
   - ✅ `fonts:read`
   - ✅ `datasets:read`

### 3. Configurer l'application

Ajouter la clé API dans votre fichier `.env.local` :

```bash
# Mapbox Geocoding API
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiVk9UUkVfVVNFUk5BTUUiLCJhIjoiY2xYWFhYWFhYIn0.XXXXXXXXXXXXXXXXXXXXXXXX
```

**⚠️ Important** : 
- La variable doit commencer par `NEXT_PUBLIC_` pour être accessible côté client
- Redémarrer le serveur Next.js après avoir ajouté la variable

### 4. Tester le géocodage

Lancer le script de test :

```bash
npx tsx scripts/test-geocoding-owendo.ts
```

## 📊 Limites du plan gratuit

- ✅ **100 000 requêtes/mois** (gratuit)
- ✅ **~3 300 requêtes/jour**
- ✅ Pas de carte bancaire requise
- ✅ Pas d'expiration

## 🌍 Avantages Mapbox

1. **Excellente couverture Afrique** : Données très à jour pour le Gabon
2. **Fiabilité** : Service stable 99.9% uptime
3. **Rapide** : Réponse en < 200ms
4. **Précision** : Meilleure que Nominatim pour l'Afrique
5. **Score de pertinence** : Chaque résultat a un score de 0 à 1

## 📖 API utilisée

**Endpoint** : `https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json`

**Paramètres** :
- `access_token` : Votre clé API
- `country=GA` : Limite les résultats au Gabon
- `limit=3` : Retourne maximum 3 résultats

**Documentation complète** : https://docs.mapbox.com/api/search/geocoding/

## 🔒 Sécurité

La clé API publique (`pk.xxx`) peut être exposée côté client en toute sécurité :
- Elle ne permet que la lecture (pas d'écriture)
- Vous pouvez restreindre l'usage par domaine dans les paramètres Mapbox
- Vous pouvez définir des quotas par clé

## ✅ Résultat attendu

Après configuration, le géocodage fonctionnera automatiquement :

```
🔍 Tentatives de géocodage avec Mapbox pour: Owendo Seeg
   1. Essai: "Owendo Seeg, Gabon"
      ✅ Trouvé: SEEG, Owendo, Estuaire, Gabon
      📍 Coordonnées: -0.188, 9.506
      📊 Pertinence: 0.95
```

## 🆘 Problèmes fréquents

### La clé ne fonctionne pas
- Vérifier que la variable commence par `NEXT_PUBLIC_`
- Redémarrer le serveur Next.js
- Vérifier que la clé est bien copiée (commence par `pk.`)

### Erreur "Configuration Mapbox manquante"
- La variable d'environnement n'est pas définie
- Créer le fichier `.env.local` à la racine du projet

### Quota dépassé
- Vous dépassez 100 000 requêtes/mois
- Passer au plan payant (0.005$/requête après)

## 📞 Support

- Documentation : https://docs.mapbox.com/
- Support : https://support.mapbox.com/
- Status : https://status.mapbox.com/
