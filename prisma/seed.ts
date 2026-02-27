import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== IMPORT DES SEEDS ====================
import { main as seedUsers } from './seeds/users.seed';
import { main as seedStations } from './seeds/stations.seed';
import { main as seedSessions } from './seeds/sessions.seed';
import { main as seedPayments } from './seeds/payments.seed';

async function main() {
  console.log('🌱 Starting database seeding...\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Seed Users
    console.log('👥 PHASE 1: UTILISATEURS');
    console.log('───────────────────────────────────────────────────────────');
    await seedUsers();
    console.log('');

    // 2. Seed Stations
    console.log('⚡ PHASE 2: BORNES DE RECHARGE');
    console.log('───────────────────────────────────────────────────────────');
    await seedStations();
    console.log('');

    // 3. Seed Sessions
    console.log('🔋 PHASE 3: SESSIONS DE RECHARGE');
    console.log('───────────────────────────────────────────────────────────');
    await seedSessions();
    console.log('');

    // 4. Seed Payments
    console.log('💰 PHASE 4: PAIEMENTS');
    console.log('───────────────────────────────────────────────────────────');
    await seedPayments();
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    // Afficher un résumé
    await displaySummary();
    
  } catch (error) {
    console.error('❌ SEEDING FAILED:', error);
    throw error;
  }
}

async function displaySummary() {
  console.log('📊 RÉSUMÉ DE LA BASE DE DONNÉES');
  console.log('───────────────────────────────────────────────────────────');
  
  const [
    usersCount,
    stationsCount,
    sessionsCount,
    paymentsCount,
    walletsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.chargingStation.count(),
    prisma.chargingSession.count(),
    prisma.payment.count(),
    prisma.wallet.count(),
  ]);

  console.log(`👥 Utilisateurs: ${usersCount}`);
  console.log(`⚡ Bornes: ${stationsCount}`);
  console.log(`🔋 Sessions: ${sessionsCount}`);
  console.log(`💰 Paiements: ${paymentsCount}`);
  console.log(`💳 Wallets: ${walletsCount}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('');
}

// Exécuter le seed
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });