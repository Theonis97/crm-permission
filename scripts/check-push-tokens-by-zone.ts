/**
 * Script pour vérifier les tokens push par zone
 * Usage: npx tsx scripts/check-push-tokens-by-zone.ts [zoneId]
 */

import { prisma } from '../lib/prisma';

async function checkTokensByZone(zoneId?: string) {
  try {
    const where: any = {
      isActive: true,
    };

    if (zoneId) {
      where.deliveryZones = {
        some: {
          id: zoneId,
          isActive: true,
        },
      };
    }

    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where,
      include: {
        pushTokens: {
          where: { isActive: true },
        },
        deliveryZones: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('\n📊 RAPPORT DES TOKENS PUSH PAR LIVREUR\n');
    console.log('='.repeat(80));

    if (deliveryPersons.length === 0) {
      console.log('⚠️  Aucun livreur trouvé');
      return;
    }

    let totalTokens = 0;
    let driversWithTokens = 0;
    let driversWithoutTokens = 0;

    deliveryPersons.forEach((person: any) => {
      const tokenCount = person.pushTokens.length;
      totalTokens += tokenCount;

      if (tokenCount > 0) {
        driversWithTokens++;
      } else {
        driversWithoutTokens++;
      }

      const zones = person.deliveryZones.map((z: any) => z.name).join(', ');
      const icon = tokenCount > 0 ? '✅' : '❌';

      console.log(`\n${icon} ${person.name}`);
      console.log(`   Email: ${person.email}`);
      console.log(`   Zones: ${zones || 'Aucune'}`);
      console.log(`   Tokens actifs: ${tokenCount}`);

      if (tokenCount > 0) {
        person.pushTokens.forEach((token: any, i: number) => {
          console.log(
            `     ${i + 1}. ${token.token.substring(0, 40)}... (${token.platform || 'unknown'})`
          );
          console.log(`        Dernière utilisation: ${token.lastUsedAt?.toLocaleDateString() || 'Jamais'}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📈 STATISTIQUES');
    console.log(`   Total livreurs: ${deliveryPersons.length}`);
    console.log(`   Avec tokens: ${driversWithTokens} ✅`);
    console.log(`   Sans tokens: ${driversWithoutTokens} ❌`);
    console.log(`   Total tokens actifs: ${totalTokens}`);

    if (driversWithoutTokens > 0) {
      console.log('\n⚠️  ACTIONS REQUISES:');
      console.log(
        '   Les livreurs sans tokens doivent ouvrir l\'application Inotech Driver et se connecter.'
      );
      console.log('   Les notifications push ne fonctionneront pas tant que les tokens ne sont pas enregistrés.');
    }

    if (zoneId) {
      console.log(`\n📍 Zone filtrée: ${zoneId}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Récupérer le zoneId depuis les arguments
const zoneId = process.argv[2];

if (zoneId) {
  console.log(`🔍 Vérification des tokens pour la zone: ${zoneId}\n`);
} else {
  console.log('🔍 Vérification des tokens pour TOUS les livreurs\n');
}

checkTokensByZone(zoneId);
