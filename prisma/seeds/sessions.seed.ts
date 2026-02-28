import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Seed des sessions...');

  // Récupérer un utilisateur et une borne existants
  const user = await prisma.user.findFirst({ where: { role: 'USER' } });
  const station = await prisma.chargingStation.findFirst();

  if (!user) {
    console.error('❌ Aucun utilisateur trouvé. Crée un utilisateur d\'abord !');
    console.log('💡 Utilise le frontend ou Prisma Studio pour créer un utilisateur avec le rôle USER');
    return;
  }

  if (!station) {
    console.error('❌ Aucune borne trouvée. Crée une borne d\'abord !');
    console.log('💡 Utilise le frontend ou Prisma Studio pour créer une borne');
    return;
  }

  console.log(`✅ Utilisateur: ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`✅ Borne: ${station.name} (${station.code})`);
  console.log('');
  console.log('📊 Création des sessions de test...');

  // ⬇️ SESSIONS COMPLETED - MAIS PAS ENCORE PAYÉES (payments.seed.ts les paiera)
  // Session 1 : Terminée (hier)
  const session1 = await prisma.chargingSession.create({
    data: {
      userId: user.id,
      stationId: station.id,
      connectorId: 1,
      status: 'COMPLETED',
      startTime: new Date('2026-02-24T10:00:00'),
      endTime: new Date('2026-02-24T11:30:00'),
      duration: 5400, // 90 minutes en secondes
      meterStart: 0,
      meterStop: 15500, // Wh
      energyConsumed: 15.5, // kWh
      pricePerKwh: 2500,
      cost: 38750,
      isPaid: false, // ⬅️ PAS ENCORE PAYÉE (sera payée dans payments.seed.ts)
    },
  });
  console.log('✅ Session 1 créée (COMPLETED):', session1.id);

  // Session 2 : Active (en ce moment)
  const session2 = await prisma.chargingSession.create({
    data: {
      userId: user.id,
      stationId: station.id,
      connectorId: 1,
      status: 'ACTIVE',
      startTime: new Date(),
      duration: 2700, // 45 minutes en secondes
      meterStart: 0,
      meterStop: 8200, // Wh
      energyConsumed: 8.2, // kWh
      pricePerKwh: 2500,
      cost: 20500,
      isPaid: false,
    },
  });
  console.log('✅ Session 2 créée (ACTIVE):', session2.id);

  // Session 3 : En attente
  const session3 = await prisma.chargingSession.create({
    data: {
      userId: user.id,
      stationId: station.id,
      connectorId: 1,
      status: 'PENDING',
      startTime: new Date(),
      energyConsumed: 0,
      pricePerKwh: 2500,
      cost: 0,
      isPaid: false,
    },
  });
  console.log('✅ Session 3 créée (PENDING):', session3.id);

  // Session 4 : Terminée (2 jours avant)
  const session4 = await prisma.chargingSession.create({
    data: {
      userId: user.id,
      stationId: station.id,
      connectorId: 1,
      status: 'COMPLETED',
      startTime: new Date('2026-02-23T14:00:00'),
      endTime: new Date('2026-02-23T15:15:00'),
      duration: 4500, // 75 minutes en secondes
      meterStart: 0,
      meterStop: 12300, // Wh
      energyConsumed: 12.3, // kWh
      pricePerKwh: 2500,
      cost: 30750,
      isPaid: false, // ⬅️ PAS ENCORE PAYÉE
    },
  });
  console.log('✅ Session 4 créée (COMPLETED):', session4.id);

  // Session 5 : Échouée
  const session5 = await prisma.chargingSession.create({
    data: {
      userId: user.id,
      stationId: station.id,
      connectorId: 1,
      status: 'FAILED',
      startTime: new Date('2026-02-23T09:00:00'),
      endTime: new Date('2026-02-23T09:05:00'),
      duration: 300, // 5 minutes en secondes
      meterStart: 0,
      meterStop: 500, // Wh
      energyConsumed: 0.5, // kWh
      pricePerKwh: 2500,
      cost: 1250,
      isPaid: false,
      failureReason: 'Connexion perdue avec le véhicule',
    },
  });
  console.log('✅ Session 5 créée (FAILED):', session5.id);

  // Session 6 : Terminée (semaine dernière)
  const session6 = await prisma.chargingSession.create({
    data: {
      userId: user.id,
      stationId: station.id,
      connectorId: 1,
      status: 'COMPLETED',
      startTime: new Date('2026-02-18T16:00:00'),
      endTime: new Date('2026-02-18T17:45:00'),
      duration: 6300, // 105 minutes en secondes
      meterStart: 0,
      meterStop: 18700, // Wh
      energyConsumed: 18.7, // kWh
      pricePerKwh: 2500,
      cost: 46750,
      isPaid: false, // ⬅️ PAS ENCORE PAYÉE
    },
  });
  console.log('✅ Session 6 créée (COMPLETED):', session6.id);

  // Session 7 : Annulée
  const session7 = await prisma.chargingSession.create({
    data: {
      userId: user.id,
      stationId: station.id,
      connectorId: 1,
      status: 'CANCELLED',
      startTime: new Date('2026-02-22T12:00:00'),
      endTime: new Date('2026-02-22T12:02:00'),
      duration: 120, // 2 minutes en secondes
      energyConsumed: 0,
      pricePerKwh: 2500,
      cost: 0,
      isPaid: false,
      stopReason: 'Annulé par l\'utilisateur',
    },
  });
  console.log('✅ Session 7 créée (CANCELLED):', session7.id);

  console.log('');
  console.log('🎉 Seed sessions terminé avec succès !');
  console.log('📊 7 sessions créées :');
  console.log('   - 3 terminées (COMPLETED) → seront payées dans payments.seed.ts');
  console.log('   - 1 active (ACTIVE)');
  console.log('   - 1 en attente (PENDING)');
  console.log('   - 1 échouée (FAILED)');
  console.log('   - 1 annulée (CANCELLED)');
  console.log('');
  console.log('🔥 Total énergie: 55.2 kWh');
  console.log('💰 Total coût sessions: 138,000 GNF');
}

// Permettre l'exécution directe
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Erreur:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}