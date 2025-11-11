// Script pour vérifier les images des produits directement en base de données
const { PrismaClient } = require('@prisma/client');

async function checkDatabaseImages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Vérification des images des produits en base de données...\n');
    
    // 1. Vérifier les produits avec images
    const productsWithImages = await prisma.product.findMany({
      where: {
        photos: {
          isEmpty: false
        }
      },
      select: {
        id: true,
        name: true,
        photos: true,
        sku: true,
        _count: {
          select: {
            storeOrderItems: true
          }
        }
      },
      take: 10
    });
    
    console.log(`📊 Produits avec photos: ${productsWithImages.length}`);
    
    productsWithImages.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   - ID: ${product.id}`);
      console.log(`   - SKU: ${product.sku || 'Pas de SKU'}`);
      console.log(`   - Photos: ${JSON.stringify(product.photos)}`);
      console.log(`   - Utilisé dans ${product._count.storeOrderItems} commandes`);
    });
    
    // 2. Vérifier les commandes récentes avec items
    console.log('\n' + '='.repeat(50));
    console.log('🛒 Vérification des commandes récentes avec items...\n');
    
    const recentOrders = await prisma.storeOrder.findMany({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'DELIVERING', 'DELIVERED']
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                photos: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`📦 Commandes récentes: ${recentOrders.length}`);
    
    let totalItems = 0;
    let itemsWithImages = 0;
    
    recentOrders.forEach((order, orderIndex) => {
      console.log(`\n📋 Commande ${order.number} (${order.items.length} items):`);
      
      order.items.forEach((item, itemIndex) => {
        totalItems++;
        
        console.log(`  ${itemIndex + 1}. ${item.name}`);
        console.log(`     - Product ID: ${item.productId}`);
        
        if (item.product) {
          console.log(`     - Product name: ${item.product.name}`);
          console.log(`     - Photos: ${JSON.stringify(item.product.photos)}`);
          console.log(`     - SKU: ${item.product.sku || 'Pas de SKU'}`);
          
          if (item.product.photos && item.product.photos.length > 0) {
            itemsWithImages++;
            console.log(`     - ✅ Image disponible: ${item.product.photos[0]}`);
          } else {
            console.log(`     - ❌ Pas d'image`);
          }
        } else {
          console.log(`     - ❌ Produit non trouvé!`);
        }
      });
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ FINAL:');
    console.log(`   Total items vérifiés: ${totalItems}`);
    console.log(`   Items avec images: ${itemsWithImages}`);
    console.log(`   Pourcentage: ${totalItems > 0 ? Math.round(itemsWithImages/totalItems*100) : 0}%`);
    
    if (itemsWithImages === 0) {
      console.log('\n⚠️  DIAGNOSTIC:');
      console.log('   - Soit les produits n\'ont pas d\'images en base');
      console.log('   - Soit le champ photos est vide/null');
      console.log('   - Soit il y a un problème de relation product');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la vérification
checkDatabaseImages();
