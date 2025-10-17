/**
 * Script de test pour vérifier les commandes d'un livreur
 * Usage: npx ts-node scripts/test-driver-orders.ts
 */

import { prisma } from '../lib/prisma';

async function testDriverOrders() {
  console.log('🔍 Test des commandes du livreur\n');

  try {
    // 1. Lister tous les livreurs
    const drivers = await prisma.deliveryPerson.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        storeId: true,
      },
    });

    console.log(`📋 ${drivers.length} livreur(s) trouvé(s):\n`);
    drivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.name} (${driver.email})`);
      console.log(`   ID: ${driver.id}`);
      console.log(`   Store ID: ${driver.storeId}\n`);
    });

    if (drivers.length === 0) {
      console.log('❌ Aucun livreur trouvé');
      return;
    }

    // Prendre le premier livreur pour le test
    const driver = drivers[0];
    console.log(`\n🚚 Test avec le livreur: ${driver.name}\n`);

    // 2. Vérifier la zone du livreur
    const zone = await prisma.deliveryZone.findFirst({
      where: {
        deliveryPersonId: driver.id,
        isActive: true,
      },
    });

    if (zone) {
      console.log(`📍 Zone assignée: ${zone.name} (${zone.id})`);
      console.log(`   Couverture: ${zone.coverage || 'N/A'}\n`);
    } else {
      console.log(`⚠️  Aucune zone assignée au livreur\n`);
    }

    // 3. Lister toutes les commandes du magasin
    const allOrders = await prisma.storeOrder.findMany({
      where: {
        storeId: driver.storeId,
      },
      select: {
        id: true,
        number: true,
        status: true,
        deliveryAddress: true,
        deliveryPersonId: true,
        deliveryZoneId: true,
        customerName: true,
        total: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📦 ${allOrders.length} commande(s) dans le magasin:\n`);

    // 4. Classifier les commandes
    const directlyAssigned = allOrders.filter(o => o.deliveryPersonId === driver.id);
    const inZone = allOrders.filter(o => zone && o.deliveryZoneId === zone.id);
    const matchedByAddress = allOrders.filter(o => {
      if (!zone || !o.deliveryAddress) return false;
      const address = o.deliveryAddress.toLowerCase();
      const zoneName = zone.name.toLowerCase();
      const zoneCoverage = zone.coverage?.toLowerCase() || '';
      return address.includes(zoneName) || (zoneCoverage && address.includes(zoneCoverage));
    });

    console.log(`📊 Classification des commandes:\n`);
    console.log(`   ✅ Assignées directement: ${directlyAssigned.length}`);
    console.log(`   ✅ Dans la zone: ${inZone.length}`);
    console.log(`   ✅ Matchées par adresse: ${matchedByAddress.length}\n`);

    // Afficher les commandes directement assignées
    if (directlyAssigned.length > 0) {
      console.log(`📋 Commandes directement assignées:\n`);
      directlyAssigned.forEach(order => {
        console.log(`   - ${order.number} | ${order.status} | ${order.customerName}`);
        console.log(`     Adresse: ${order.deliveryAddress || 'N/A'}\n`);
      });
    }

    // Afficher les commandes matchées par adresse
    if (matchedByAddress.length > 0) {
      console.log(`📋 Commandes matchées par adresse:\n`);
      matchedByAddress.forEach(order => {
        console.log(`   - ${order.number} | ${order.status} | ${order.customerName}`);
        console.log(`     Adresse: ${order.deliveryAddress || 'N/A'}\n`);
      });
    }

    // 5. Compter par statut
    const statusCount = allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`📈 Répartition par statut (toutes commandes):\n`);
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDriverOrders();
