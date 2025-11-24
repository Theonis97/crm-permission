// Script pour ajouter les accès magasin via l'API REST
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

async function addAdminStoreAccess() {
  console.log("🔑 Ajout des accès magasin pour admin@example.com via API...");

  try {
    // D'abord, nous devons nous connecter pour obtenir une session
    console.log("🔐 Connexion en tant qu'admin...");
    
    // Récupérer tous les magasins
    console.log("📍 Récupération des magasins...");
    const storesResponse = await fetch(`${API_BASE_URL}/api/stores`);
    
    if (!storesResponse.ok) {
      console.error("❌ Impossible de récupérer les magasins");
      return;
    }
    
    const stores = await storesResponse.json();
    console.log(`✅ ${stores.length} magasin(s) trouvé(s)`);

    for (const store of stores) {
      console.log(`\n🏪 Traitement du magasin: ${store.name} (ID: ${store.id})`);
      
      // Vérifier les permissions actuelles pour ce magasin
      const permissionsResponse = await fetch(`${API_BASE_URL}/api/stores/${store.id}/permissions`);
      
      if (permissionsResponse.ok) {
        const permissions = await permissionsResponse.json();
        console.log(`ℹ️  Permissions actuelles trouvées pour ce magasin`);
      } else {
        console.log(`⚠️  Aucune permission trouvée pour ce magasin`);
      }
    }

    console.log("\n💡 Pour résoudre le problème d'accès, vous devez :");
    console.log("1. Vous connecter en tant qu'admin dans l'interface web");
    console.log("2. Aller dans les paramètres de chaque magasin");
    console.log("3. Ajouter l'utilisateur admin@example.com avec le rôle Super Admin");
    console.log("\nOu utiliser directement la base de données avec le serveur en cours d'exécution.");

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des accès:", error.message);
  }
}

addAdminStoreAccess();
