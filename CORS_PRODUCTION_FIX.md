# Fix CORS Production - Backend CRM Sambatech

## 🎯 Problème identifié
```
Access to fetch at 'http://172.20.10.10:3001/api/mobile/auth/me' 
from origin 'http://172.20.10.10:3001' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Solution appliquée

### 1. Configuration Next.js (`next.config.ts`)
```typescript
{
  key: "Access-Control-Allow-Origin",
  value: process.env.NODE_ENV === "production" 
    ? "http://172.20.10.10:3001" 
    : "*",
}
```

### 2. Middleware CORS (`middleware.ts`)
```typescript
const allowedOrigin = process.env.NODE_ENV === 'production' 
  ? 'http://172.20.10.10:3001' 
  : '*';
```

## 🚀 Étapes de déploiement

### 1. Redéployer le backend
```bash
cd /path/to/crm-sambatech
npm run build
pm2 restart backend  # ou votre méthode de redémarrage
```

### 2. Vérifier les variables d'environnement
```bash
# Sur le serveur de production
echo $NODE_ENV  # Doit être "production"
```

### 3. Tester la configuration CORS
```bash
# Depuis le serveur backend
node scripts/test-cors.js
```

### 4. Vérifier les headers HTTP
```bash
# Test manuel avec curl
curl -H "Origin: http://172.20.10.10:3001" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type, Authorization" \
     -X OPTIONS \
     http://172.20.10.10:3001/api/mobile/auth/me -v
```

## 🔍 Diagnostic

### Headers attendus dans la réponse :
```
Access-Control-Allow-Origin: http://172.20.10.10:3001
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: false
Access-Control-Max-Age: 86400
```

### Vérification côté PWA :
1. Ouvrir http://172.20.10.10:3001
2. Ouvrir DevTools → Console
3. Chercher les erreurs CORS
4. Vérifier les logs du NetworkDiagnostic

## ⚠️ Points d'attention

### 1. Cache du navigateur
```bash
# Vider le cache après changement CORS
# Chrome: DevTools → Network → Disable cache
# Ou navigation privée
```

### 2. CDN/Proxy
Si vous utilisez un CDN (Cloudflare, etc.), vérifiez qu'il ne cache pas les headers CORS.

### 3. Nginx/Apache
Si vous avez un reverse proxy, vérifiez qu'il ne supprime pas les headers CORS :

**Nginx :**
```nginx
add_header 'Access-Control-Allow-Origin' 'http://172.20.10.10:3001' always;
```

**Apache :**
```apache
Header always set Access-Control-Allow-Origin "http://172.20.10.10:3001"
```

## 🧪 Tests de validation

### 1. Test automatique
```bash
node scripts/test-cors.js
```

### 2. Test manuel navigateur
```javascript
// Dans la console de livreur.inotech-gabon.com
fetch('http://172.20.10.10:3001/api/mobile/auth/me', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => console.log('✅ CORS OK:', r.status))
.catch(e => console.log('❌ CORS Error:', e.message));
```

### 3. Vérification des logs
```bash
# Logs du backend
pm2 logs backend

# Ou selon votre setup
tail -f /var/log/backend.log
```

## 📋 Checklist de déploiement

- [ ] Modifications appliquées dans `next.config.ts`
- [ ] Modifications appliquées dans `middleware.ts`
- [ ] Backend redéployé avec `NODE_ENV=production`
- [ ] Test CORS réussi avec le script
- [ ] Cache navigateur vidé
- [ ] PWA testée en production
- [ ] Logs vérifiés (pas d'erreurs CORS)

## 🆘 Si le problème persiste

1. **Vérifier les logs serveur** pour voir si les requêtes arrivent
2. **Tester avec curl** pour isoler le problème navigateur vs serveur
3. **Vérifier la configuration du reverse proxy** (nginx/apache)
4. **Contacter l'hébergeur** si problème d'infrastructure

## 📞 Support
En cas de problème, fournir :
- Logs du backend
- Résultat du script `test-cors.js`
- Screenshot des erreurs DevTools
- Configuration serveur (nginx/apache)
