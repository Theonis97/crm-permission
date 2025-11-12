/**
 * Script de debug pour diagnostiquer le problème des statistiques de livreur
 * Usage: npx tsx scripts/test-driver-orders.ts
 */

import { prisma } from '../lib/prisma';
import { calculateTotalCommissions } from '../lib/commission-calculator';

async function debugDriverStats() {
  console.log('🔍 DEBUG: Statistiques des livreurs\n');

  try {
    // 1. Lister tous les livreurs
    const drivers = await prisma.deliveryPerson.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log(`📋 ${drivers.length} livreur(s) trouvé(s):\n`);
    drivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.name} (${driver.id}) - ${driver.isActive ? '✅ Actif' : '❌ Inactif'}`);
    });

    if (drivers.length === 0) {
      console.log('❌ Aucun livreur trouvé dans la base de données');
      return;
    }

    // 2. Prendre le premier livreur pour les tests
    const testDriver = drivers[0];
    console.log(`\n🎯 Test avec le livreur: ${testDriver.name} (${testDriver.id})\n`);

    // 3. Vérifier TOUTES les commandes avec deliveryPersonId
    const allOrdersWithDriver = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: testDriver.id,
      },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        deliveredAt: true,
        createdAt: true,
        customerName: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📦 ${allOrdersWithDriver.length} commandes assignées au livreur:`);
    if (allOrdersWithDriver.length === 0) {
      console.log('❌ PROBLÈME: Aucune commande assignée à ce livreur!');
      console.log('💡 Vérifiez que les commandes ont bien deliveryPersonId renseigné\n');
      
      // Vérifier s'il y a des commandes sans livreur assigné
      const ordersWithoutDriver = await prisma.storeOrder.count({
        where: {
          deliveryPersonId: null,
          status: { not: 'PENDING' }
        }
      });
      console.log(`⚠️ ${ordersWithoutDriver} commandes sans livreur assigné\n`);
      
    } else {
      allOrdersWithDriver.forEach((order, index) => {
        console.log(`  ${index + 1}. ${order.number} - ${order.status} - ${order.total} FCFA - ${order.customerName}`);
      });
    }

    // 4. Tester EXACTEMENT les requêtes de l'API driver-stats
    console.log('\n🔍 Test des requêtes API (comme dans /api/delivery/driver-stats):\n');
    
    // Commandes acceptées (CONFIRMED ou plus)
    const acceptedOrders = await prisma.storeOrder.count({
      where: {
        deliveryPersonId: testDriver.id,
        status: {
          in: ["CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED"],
        },
      },
    });
    console.log(`✅ Commandes acceptées: ${acceptedOrders}`);

    // Commandes livrées avec détails
    const deliveredOrders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: testDriver.id,
        status: "DELIVERED",
      },
      select: {
        id: true,
        number: true,
        total: true,
        deliveredAt: true,
        customerName: true,
      },
    });
    console.log(`🚚 Commandes livrées: ${deliveredOrders.length}`);
    
    if (deliveredOrders.length > 0) {
      console.log('Détail des commandes livrées:');
      deliveredOrders.forEach((order, index) => {
        console.log(`  ${index + 1}. ${order.number} - ${order.total} FCFA - ${order.customerName} - ${order.deliveredAt}`);
      });
    }

    // Commandes annulées
    const cancelledOrders = await prisma.storeOrder.count({
      where: {
        deliveryPersonId: testDriver.id,
        status: "CANCELLED",
      },
    });
    console.log(`❌ Commandes annulées: ${cancelledOrders}`);

    // 5. Tester le calcul des commissions
    console.log('\n💰 Test du calcul des commissions:');
    const commissionStats = calculateTotalCommissions(deliveredOrders);
    console.log(`Commission totale: ${commissionStats.totalCommission} FCFA`);
    console.log(`Nombre de livraisons: ${commissionStats.deliveriesCount}`);
    console.log(`Panier moyen: ${commissionStats.averageOrderAmount} FCFA`);
    
    if (commissionStats.commissionDetails.length > 0) {
      console.log('Détail des commissions:');
      commissionStats.commissionDetails.forEach((detail, index) => {
        console.log(`  ${index + 1}. ${detail.orderAmount} FCFA → ${detail.commission} FCFA commission`);
      });
    }

    // 6. Vérifier les zones assignées
    const assignedZones = await prisma.deliveryZone.findMany({
      where: {
        deliveryPersonId: testDriver.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });
    console.log(`\n🗺️ ${assignedZones.length} zones assignées:`);
    assignedZones.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.name} (${zone.color})`);
    });

    // 7. Simuler EXACTEMENT la réponse de l'API
    console.log('\n📡 Simulation de la réponse API:');
    const apiResponse = {
      success: true,
      data: {
        driver: {
          id: testDriver.id,
          name: testDriver.name,
          phone: testDriver.phone,
          email: testDriver.email,
          isActive: testDriver.isActive,
          joinedAt: testDriver.createdAt,
        },
        stats: {
          revenue: commissionStats.totalCommission,
          acceptedOrders: acceptedOrders,
          deliveredOrders: deliveredOrders.length,
          cancelledOrders: cancelledOrders,
          averageOrderAmount: commissionStats.averageOrderAmount,
          totalDeliveries: commissionStats.deliveriesCount,
        },
        assignedZones,
        period: 'all',
      },
    };
    
    console.log(JSON.stringify(apiResponse, null, 2));

    console.log('\n✅ Debug terminé');

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDriverStats();
