// Script pour vérifier les livreurs en base de données
const { PrismaClient } = require('@prisma/client');

async function checkDrivers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('👥 Vérification des livreurs en base de données...\n');
    
    const drivers = await prisma.deliveryPerson.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Total livreurs: ${drivers.length}`);
    
    const activeDrivers = drivers.filter(d => d.isActive);
    const inactiveDrivers = drivers.filter(d => !d.isActive);
    
    console.log(`✅ Livreurs actifs: ${activeDrivers.length}`);
    console.log(`❌ Livreurs inactifs: ${inactiveDrivers.length}\n`);
    
    console.log('📋 LISTE DES LIVREURS:');
    drivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.name}`);
      console.log(`   - ID: ${driver.id}`);
      console.log(`   - Email: ${driver.email}`);
      console.log(`   - Téléphone: ${driver.phone || 'Non renseigné'}`);
      console.log(`   - Statut: ${driver.isActive ? '✅ ACTIF' : '❌ INACTIF'}`);
      console.log(`   - Créé le: ${driver.createdAt.toLocaleDateString()}\n`);
    });
    
    if (activeDrivers.length === 0) {
      console.log('⚠️  ATTENTION: Aucun livreur actif trouvé!');
      console.log('   Cela peut expliquer les erreurs 401 si le token contient un ID de livreur inactif.');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDrivers();
