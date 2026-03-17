import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  console.log('🗑️  Nettoyage des données de test...\n');

  try {
    // 1. Supprimer les paiements
    const paymentsDeleted = await prisma.payment.deleteMany({});
    console.log(`✅ ${paymentsDeleted.count} paiements supprimés`);

    // 2. Supprimer les sessions
    const sessionsDeleted = await prisma.chargingSession.deleteMany({});
    console.log(`✅ ${sessionsDeleted.count} sessions supprimées`);

    // 3. Supprimer les transactions wallet
    const transactionsDeleted = await prisma.walletTransaction.deleteMany({});
    console.log(`✅ ${transactionsDeleted.count} transactions wallet supprimées`);

    // 4. Réinitialiser les wallets à 200K
    const walletsReset = await prisma.wallet.updateMany({
      data: { balance: 200000 },
    });
    console.log(`✅ ${walletsReset.count} wallets réinitialisés à 200K GNF`);

    // 5. Supprimer les notifications
    const notificationsDeleted = await prisma.notification.deleteMany({});
    console.log(`✅ ${notificationsDeleted.count} notifications supprimées`);

    // 6. Supprimer les logs système
    const logsDeleted = await prisma.systemLog.deleteMany({});
    console.log(`✅ ${logsDeleted.count} logs système supprimés`);

    // 7. Supprimer les favoris
    const favoritesDeleted = await prisma.favoriteStation.deleteMany({});
    console.log(`✅ ${favoritesDeleted.count} favoris supprimés`);

    // 8. Supprimer les reviews
    const reviewsDeleted = await prisma.review.deleteMany({});
    console.log(`✅ ${reviewsDeleted.count} reviews supprimées`);

    console.log('\n🎉 Nettoyage terminé avec succès !');

    // Afficher le résumé
    const [users, stations, offers, wallets, sessions, payments] = await Promise.all([
      prisma.user.count(),
      prisma.chargingStation.count(),
      prisma.chargingOffer.count(),
      prisma.wallet.count(),
      prisma.chargingSession.count(),
      prisma.payment.count(),
    ]);

    console.log('\n📊 Résumé des données restantes :');
    console.log(`   👥 Users: ${users}`);
    console.log(`   ⚡ Stations: ${stations}`);
    console.log(`   🎁 Offers: ${offers}`);
    console.log(`   💰 Wallets: ${wallets} (réinitialisés à 200K)`);
    console.log(`   🔋 Sessions: ${sessions}`);
    console.log(`   💳 Payments: ${payments}`);

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();