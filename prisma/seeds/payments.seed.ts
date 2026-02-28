import { PrismaClient, PaymentStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

const sessionPaymentMethods: PaymentMethod[] = ['WALLET', 'MOBILE_MONEY', 'CARD'];
const walletRechargeMethods: PaymentMethod[] = ['MOBILE_MONEY', 'CARD'];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomAmount(): number {
  const amounts = [5000, 8000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000];
  return randomElement(amounts);
}

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

async function seedPayments() {
  console.log('🌱 Seeding payments...');

  const users = await prisma.user.findMany();
  const completedSessions = await prisma.chargingSession.findMany({
    where: { status: 'COMPLETED', isPaid: false },
  });
  const activeSessions = await prisma.chargingSession.findMany({
    where: { status: 'ACTIVE' },
  });

  if (users.length === 0) {
    console.log('❌ Aucun utilisateur trouvé.');
    return;
  }

  if (completedSessions.length === 0) {
    console.log('⚠️  Aucune session COMPLETED trouvée.');
  }

  console.log(`📊 ${completedSessions.length} sessions COMPLETED disponibles`);
  console.log(`📊 ${activeSessions.length} sessions ACTIVE disponibles`);

  let paymentsCreated = 0;

  // ============================================================================
  // PARTIE 1 : PAIEMENTS DE SESSIONS DE RECHARGE
  // ============================================================================

  console.log('\n💚 === PAIEMENTS DE SESSIONS DE RECHARGE ===');

  // 1A. Paiements COMPLETED pour sessions terminées
  console.log('\n✅ Création des paiements COMPLETED pour sessions...');
  
  for (const session of completedSessions) {
    const method = randomElement(sessionPaymentMethods) as PaymentMethod;
    const createdAt = new Date(session.endTime!.getTime() + Math.random() * 300000);
    const completedAt = new Date(createdAt.getTime() + Math.random() * 60000);

    const payment = await prisma.payment.create({
      data: {
        userId: session.userId,
        amount: session.cost || 0,
        currency: 'GNF',
        method: method,
        status: 'COMPLETED' as PaymentStatus,
        reference: `SESSION-PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        description: method === 'WALLET' 
          ? 'Paiement session de recharge via NG Wallet'
          : `Paiement session de recharge via ${method}`,
        createdAt,
        completedAt,
        cinetpayTransactionId: method !== 'WALLET' ? `EVCHARGE-${Date.now()}-${paymentsCreated}` : null,
      },
    });

    await prisma.chargingSession.update({
      where: { id: session.id },
      data: { 
        paymentId: payment.id,
        isPaid: true,
      },
    });

    paymentsCreated++;
    console.log(`   ✅ Paiement ${session.id.substring(0, 8)}... -> ${method} (${session.cost} GNF)`);
  }

  // 1B. Paiements PENDING pour sessions actives
  console.log('\n⏳ Création des paiements PENDING pour sessions actives...');
  
  for (const session of activeSessions.slice(0, 2)) {
    const method = randomElement(['MOBILE_MONEY', 'CARD']) as PaymentMethod;
    const createdAt = new Date(session.startTime.getTime() + 60000);

    const payment = await prisma.payment.create({
      data: {
        userId: session.userId,
        amount: session.cost || 0,
        currency: 'GNF',
        method: method,
        status: 'PENDING' as PaymentStatus,
        reference: `SESSION-PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        description: `Paiement session en attente via ${method}`,
        createdAt,
        cinetpayTransactionId: `EVCHARGE-${Date.now()}-PENDING-${paymentsCreated}`,
        cinetpayPaymentUrl: `https://checkout.cinetpay.com/payment/${paymentsCreated}`,
      },
    });

    await prisma.chargingSession.update({
      where: { id: session.id },
      data: { paymentId: payment.id },
    });

    paymentsCreated++;
    console.log(`   ⏳ Paiement ${session.id.substring(0, 8)}... -> PENDING`);
  }

  // 1C. Paiements FAILED
  console.log('\n❌ Création des paiements FAILED pour sessions...');
  
  const station = await prisma.chargingStation.findFirst();
  
  if (station) {
    for (let i = 0; i < 2; i++) {
      const user = randomElement(users);
      const createdAt = randomDate(7);
      
      const failedSession = await prisma.chargingSession.create({
        data: {
          userId: user.id,
          stationId: station.id,
          connectorId: 1,
          status: 'FAILED',
          startTime: createdAt,
          endTime: new Date(createdAt.getTime() + 120000),
          duration: 120,
          meterStart: 0,
          meterStop: 200,
          energyConsumed: 0.2,
          pricePerKwh: 2500,
          cost: 500,
          isPaid: false,
          failureReason: 'Connexion perdue avec le véhicule',
        },
      });

      const failedAt = new Date(createdAt.getTime() + Math.random() * 1800000);

      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: failedSession.cost!,
          currency: 'GNF',
          method: randomElement(['MOBILE_MONEY', 'CARD']) as PaymentMethod,
          status: 'FAILED' as PaymentStatus,
          reference: `SESSION-PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          description: `Paiement session échoué`,
          createdAt,
          failedAt,
          failureReason: randomElement([
            'Solde insuffisant',
            'Transaction annulée',
            'Erreur réseau',
            'Timeout',
          ]),
          cinetpayTransactionId: `EVCHARGE-${Date.now()}-FAIL-${i}`,
        },
      });

      await prisma.chargingSession.update({
        where: { id: failedSession.id },
        data: { paymentId: payment.id },
      });

      paymentsCreated++;
      console.log(`   ❌ Paiement FAILED ${failedSession.id.substring(0, 8)}...`);
    }
  }

  // 1D. Paiements REFUNDED
  console.log('\n🔄 Création des paiements REFUNDED pour sessions...');
  
  const sessionsToRefund = await prisma.chargingSession.findMany({
    where: { status: 'COMPLETED', isPaid: true },
    take: 2,
  });

  for (const session of sessionsToRefund) {
    const method = randomElement(sessionPaymentMethods) as PaymentMethod;
    const createdAt = new Date(session.endTime!.getTime() + Math.random() * 300000);
    const completedAt = new Date(createdAt.getTime() + Math.random() * 3600000);
    const refundedAt = new Date(completedAt.getTime() + Math.random() * 86400000);

    const payment = await prisma.payment.create({
      data: {
        userId: session.userId,
        amount: session.cost || 0,
        currency: 'GNF',
        method: method,
        status: 'REFUNDED' as PaymentStatus,
        reference: `SESSION-PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        description: `Paiement session remboursé via ${method}`,
        createdAt,
        completedAt,
        refundedAt,
        refundReason: randomElement([
          'Annulation de session',
          'Erreur de facturation',
          'Demande du client',
          'Session interrompue',
        ]),
        cinetpayTransactionId: method !== 'WALLET' ? `EVCHARGE-${Date.now()}-REF-${paymentsCreated}` : null,
      },
    });

    await prisma.chargingSession.update({
      where: { id: session.id },
      data: { 
        paymentId: payment.id,
        isPaid: false,
      },
    });

    paymentsCreated++;
    console.log(`   🔄 Paiement REFUNDED ${session.id.substring(0, 8)}...`);
  }

  // ============================================================================
  // PARTIE 2 : RECHARGES WALLET NG WALLET
  // ============================================================================

  console.log('\n💰 === RECHARGES WALLET NG WALLET (via Cinetpay) ===');
  console.log('ℹ️  Ces paiements NE sont PAS liés à des sessions de recharge');
  
  for (let i = 0; i < 3; i++) {
    const user = randomElement(users);
    const amount = randomAmount();
    const createdAt = randomDate(15);
    const completedAt = new Date(createdAt.getTime() + Math.random() * 1800000);

    await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        currency: 'GNF',
        method: randomElement(walletRechargeMethods) as PaymentMethod,
        status: 'COMPLETED' as PaymentStatus,
        reference: `WALLET-RECHARGE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        description: `Recharge NG Wallet ${amount} GNF`,
        createdAt,
        completedAt,
        cinetpayTransactionId: `EVCHARGE-${Date.now()}-WALLET-${i}`,
      },
    });

    paymentsCreated++;
    const userName = `${user.firstName} ${user.lastName}`;
    console.log(`   💰 Recharge wallet ${amount} GNF pour ${userName}`);
  }

  // ============================================================================
  // STATISTIQUES FINALES
  // ============================================================================
  console.log('\n📊 =============== STATISTIQUES FINALES ===============');
  console.log(`   ✅ Total paiements créés: ${paymentsCreated}`);
  
  const stats = await prisma.payment.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('\n📈 Par statut :');
  stats.forEach(stat => {
    console.log(`   ${stat.status}: ${stat._count}`);
  });

  const paymentsWithSession = await prisma.payment.count({
    where: {
      sessions: {
        some: {},
      },
    },
  });

  const paymentsWithoutSession = await prisma.payment.count({
    where: {
      sessions: {
        none: {},
      },
    },
  });

  console.log('\n🔗 Par type :');
  console.log('   Paiements de sessions:', paymentsWithSession);
  console.log('   Recharges wallet:', paymentsWithoutSession);
  
  const methodStats = await prisma.payment.groupBy({
    by: ['method'],
    _count: true,
  });

  console.log('\n💳 Par méthode :');
  methodStats.forEach(stat => {
    const methodName = stat.method || 'NULL';
    const count = stat._count;
    console.log(`   ${methodName}: ${count}`);
  });
}

async function seedWallets() {
  console.log('\n💳 Seeding wallets...');

  const users = await prisma.user.findMany();

  for (const user of users) {
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!existingWallet) {
      const balance = Math.floor(Math.random() * 100000) + 10000;

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance,
        },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: balance,
          balanceBefore: 0,
          balanceAfter: balance,
          description: 'Solde initial',
        },
      });

      const userName = `${user.firstName} ${user.lastName}`;
      const balanceFormatted = balance.toLocaleString();
      console.log(`   ✅ Wallet créé pour ${userName}: ${balanceFormatted} GNF`);
    }
  }
}

export async function main() {
  try {
    await seedWallets();
    await seedPayments();
  } catch (error) {
    console.error('❌ Erreur lors du seeding des paiements:', error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}