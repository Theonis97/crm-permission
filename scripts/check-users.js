// Script pour vérifier les utilisateurs en base
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Vérification des utilisateurs en base...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        userRoles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      take: 10
    });
    
    console.log(`📊 ${users.length} utilisateur(s) trouvé(s):`);
    
    users.forEach(user => {
      const roles = user.userRoles.map(ur => ur.role.name).join(', ');
      console.log(`- ${user.email} (${user.firstName} ${user.lastName})`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Rôles: ${roles}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
