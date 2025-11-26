import { prisma } from '../lib/prisma';

async function createTestNotifications() {
  try {
    console.log('📬 Création de notifications de test...\n');

    // Récupérer tous les livreurs actifs
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: {
        isActive: true,
      },
      take: 1, // Pour le test, on prend juste le premier
    });

    if (deliveryPersons.length === 0) {
      console.log('❌ Aucun livreur actif trouvé dans la base de données');
      console.log('💡 Créez d\'abord un livreur avant de créer des notifications de test');
      return;
    }

    const deliveryPerson = deliveryPersons[0];
    console.log(`✅ Livreur trouvé: ${deliveryPerson.name} (${deliveryPerson.email})\n`);

    // Supprimer les anciennes notifications de test (optionnel)
    const deleted = await prisma.deliveryNotification.deleteMany({
      where: {
        deliveryPersonId: deliveryPerson.id,
        body: {
          contains: '[TEST]',
        },
      },
    });
    console.log(`🗑️  ${deleted.count} anciennes notifications de test supprimées\n`);

    // Créer des notifications de test variées
    const testNotifications = [
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Nouvelle commande',
        body: '[TEST] Une nouvelle commande a été ajoutée à votre zone Th',
        type: 'ORDER' as const,
        isRead: false,
        data: {
          orderId: 'test-order-1',
          orderNumber: 'ORD-001',
          zoneId: 'zone1',
          zoneName: 'Th',
          customerName: 'Test Client',
          total: 25000,
        },
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Commande acceptée',
        body: '[TEST] La commande #ORD-002 a été acceptée et est prête pour livraison',
        type: 'ORDER' as const,
        isRead: false,
        data: {
          orderId: 'test-order-2',
          orderNumber: 'ORD-002',
        },
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Commande livrée',
        body: '[TEST] La commande #ORD-098 a été marquée comme livrée avec succès',
        type: 'ORDER' as const,
        isRead: true,
        data: {
          orderId: 'test-order-3',
          orderNumber: 'ORD-098',
          deliveredAt: new Date(),
        },
        readAt: new Date(),
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Mise à jour système',
        body: '[TEST] Une nouvelle version de l\'application est disponible. Mettez à jour pour profiter des nouvelles fonctionnalités.',
        type: 'SYSTEM' as const,
        isRead: false,
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Commission calculée',
        body: '[TEST] Votre commission du jour est de 3 500 FCFA pour 5 livraisons effectuées',
        type: 'INFO' as const,
        isRead: false,
        data: {
          amount: 3500,
          deliveriesCount: 5,
          period: 'today',
        },
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Objectif atteint !',
        body: '[TEST] Félicitations ! Vous avez atteint votre objectif de 10 livraisons aujourd\'hui',
        type: 'INFO' as const,
        isRead: true,
        data: {
          goal: 10,
          achieved: 10,
        },
        readAt: new Date(Date.now() - 2 * 3600000), // Il y a 2 heures
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Zone mise à jour',
        body: '[TEST] La zone Th a été étendue. Consultez la carte pour voir les nouvelles limites',
        type: 'SYSTEM' as const,
        isRead: false,
        data: {
          zoneId: 'zone1',
          zoneName: 'Th',
        },
      },
      {
        deliveryPersonId: deliveryPerson.id,
        title: 'Nouvelle commande urgente',
        body: '[TEST] Commande urgente #ORD-105 assignée. Le client attend la livraison rapidement',
        type: 'ORDER' as const,
        isRead: false,
        data: {
          orderId: 'test-order-4',
          orderNumber: 'ORD-105',
          priority: 'urgent',
        },
      },
    ];

    // Créer les notifications avec des délais différents
    for (const [index, notificationData] of testNotifications.entries()) {
      const createdAt = new Date(Date.now() - (testNotifications.length - index) * 3600000); // Échelonner dans le temps
      
      await prisma.deliveryNotification.create({
        data: {
          ...notificationData,
          createdAt,
        },
      });

      console.log(`✅ Notification ${index + 1}/${testNotifications.length} créée: "${notificationData.title}"`);
    }

    console.log(`\n🎉 ${testNotifications.length} notifications de test créées avec succès!`);
    
    // Afficher le résumé
    const totalNotifications = await prisma.deliveryNotification.count({
      where: {
        deliveryPersonId: deliveryPerson.id,
      },
    });

    const unreadNotifications = await prisma.deliveryNotification.count({
      where: {
        deliveryPersonId: deliveryPerson.id,
        isRead: false,
      },
    });

    console.log(`\n📊 Résumé pour ${deliveryPerson.name}:`);
    console.log(`   - Total: ${totalNotifications} notifications`);
    console.log(`   - Non lues: ${unreadNotifications} notifications`);
    console.log(`   - Lues: ${totalNotifications - unreadNotifications} notifications`);
    
    console.log(`\n🔗 Testez maintenant l'API avec :`);
    console.log(`   curl -H "Authorization: Bearer <TOKEN>" \\`);
    console.log(`     http://192.168.1.115:3001/api/mobile/notifications`);

  } catch (error) {
    console.error('❌ Erreur lors de la création des notifications de test:', error);
    throw error;
  }
}

// Exécution du script
createTestNotifications()
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Connexion à la base de données fermée');
  });
