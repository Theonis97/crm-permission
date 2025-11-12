/**
 * Script de test pour l'API des livraisons groupées par jour
 * Usage: npx tsx scripts/test-deliveries-api.ts
 */

import { prisma } from '../lib/prisma';

async function testDeliveriesAPI() {
  try {
    console.log('🧪 Test de l\'API des livraisons groupées par jour');
    console.log('================================================');

    // 1. Vérifier qu'il y a des livreurs
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    console.log(`\n📋 Livreurs trouvés: ${deliveryPersons.length}`);
    deliveryPersons.forEach((person, index) => {
      console.log(`  ${index + 1}. ${person.name} (${person.id})`);
    });

    if (deliveryPersons.length === 0) {
      console.log('❌ Aucun livreur trouvé. Impossible de tester.');
      return;
    }

    const testDeliveryPersonId = deliveryPersons[0].id;
    console.log(`\n🎯 Test avec le livreur: ${deliveryPersons[0].name}`);

    // 2. Vérifier les commandes du livreur
    const orders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: testDeliveryPersonId,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        createdAt: true,
        customerName: true,
      },
    });

    console.log(`\n📦 Commandes du livreur: ${orders.length}`);
    orders.forEach((order, index) => {
      console.log(`  ${index + 1}. #${order.number} - ${order.status} - ${order.total} FCFA - ${order.customerName}`);
    });

    // 3. Vérifier les clôtures existantes
    const dayShifts = await prisma.dayShift.findMany({
      where: {
        deliveryPersonId: testDeliveryPersonId,
      },
      take: 5,
      orderBy: {
        date: 'desc',
      },
      select: {
        id: true,
        date: true,
        commission: true,
        totalOrders: true,
        deliveredOrders: true,
      },
    });

    console.log(`\n🔒 Clôtures de journée: ${dayShifts.length}`);
    dayShifts.forEach((shift, index) => {
      console.log(`  ${index + 1}. ${shift.date.toISOString().split('T')[0]} - ${shift.deliveredOrders}/${shift.totalOrders} - ${shift.commission} FCFA`);
    });

    // 4. Simuler la logique de groupement par jour
    console.log('\n📊 Simulation du groupement par jour:');
    
    const deliveriesByDay = new Map<string, any>();
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dayKey = orderDate.toISOString().split('T')[0];
      
      if (!deliveriesByDay.has(dayKey)) {
        deliveriesByDay.set(dayKey, {
          date: dayKey,
          orders: [],
          stats: { total: 0, delivered: 0, cancelled: 0, pending: 0 },
        });
      }
      
      const dayData = deliveriesByDay.get(dayKey);
      dayData.orders.push(order);
      dayData.stats.total++;
      
      switch (order.status) {
        case 'DELIVERED':
          dayData.stats.delivered++;
          break;
        case 'CANCELLED':
          dayData.stats.cancelled++;
          break;
        default:
          dayData.stats.pending++;
      }
    });

    Array.from(deliveriesByDay.values()).forEach((dayData, index) => {
      console.log(`  ${index + 1}. ${dayData.date}: ${dayData.stats.delivered}/${dayData.stats.total} commandes`);
    });

    console.log('\n✅ Test terminé avec succès !');
    console.log('\n💡 Pour tester l\'API complète:');
    console.log('   GET /api/mobile/deliveries');
    console.log('   Authorization: Bearer <token_livreur>');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testDeliveriesAPI();
