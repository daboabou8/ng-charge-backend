import { PrismaClient, PaymentStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

const paymentMethods: PaymentMethod[] = ['WALLET', 'MOBILE_MONEY', 'CARD'];
const paymentStatuses: PaymentStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PROCESSING'];

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
  const sessions = await prisma.chargingSession.findMany({
    where: { status: 'COMPLETED' },
  });

  if (users.length === 0) {
    console.log('❌ Aucun utilisateur trouvé.');
    return;
  }

  const paymentsToCreate: any[] = [];

  // 1. Paiements COMPLETED (60%) - Certains liés à des sessions
  for (let i = 0; i < 30; i++) {
    const user = randomElement(users);
    const method = randomElement(paymentMethods);
    const amount = randomAmount();
    const createdAt = randomDate(30);
    const completedAt = new Date(createdAt.getTime() + Math.random() * 3600000);

    // ⬇️ LIER 10 PAIEMENTS À DES SESSIONS
    const linkedSession = i < 10 && sessions.length > i ? sessions[i] : null;

    paymentsToCreate.push({
      userId: user.id,
      amount: linkedSession ? linkedSession.cost : amount,
      currency: 'GNF',
      method,
      status: 'COMPLETED' as PaymentStatus,
      reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      description: method === 'WALLET' 
        ? 'Paiement session de recharge via NG Wallet'
        : `Paiement session de recharge via ${method}`,
      createdAt,
      completedAt,
      cinetpayTransactionId: method !== 'WALLET' ? `EVCHARGE-${Date.now()}-${i}` : null,
      // ⬇️ NE PAS AJOUTER paymentId ICI, on le fera après avec update
      sessionId: linkedSession?.id || null, // Garder pour référence
    });
  }

  // 2. Paiements PENDING (15%)
  for (let i = 0; i < 8; i++) {
    const user = randomElement(users);
    const method = randomElement(['MOBILE_MONEY', 'CARD']);
    const amount = randomAmount();
    const createdAt = randomDate(3);

    paymentsToCreate.push({
      userId: user.id,
      amount,
      currency: 'GNF',
      method,
      status: 'PENDING' as PaymentStatus,
      reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      description: `Paiement en attente via ${method}`,
      createdAt,
      cinetpayTransactionId: `EVCHARGE-${Date.now()}-PENDING-${i}`,
      cinetpayPaymentUrl: `https://checkout.cinetpay.com/payment/${i}`,
      sessionId: null,
    });
  }

  // 3. Paiements PROCESSING (10%)
  for (let i = 0; i < 5; i++) {
    const user = randomElement(users);
    const method = randomElement(['MOBILE_MONEY', 'CARD']);
    const amount = randomAmount();
    const createdAt = randomDate(1);

    paymentsToCreate.push({
      userId: user.id,
      amount,
      currency: 'GNF',
      method,
      status: 'PROCESSING' as PaymentStatus,
      reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      description: `Paiement en cours via ${method}`,
      createdAt,
      cinetpayTransactionId: `EVCHARGE-${Date.now()}-PROC-${i}`,
      cinetpayPaymentUrl: `https://checkout.cinetpay.com/payment/${i}`,
      sessionId: null,
    });
  }

  // 4. Paiements FAILED (10%)
  for (let i = 0; i < 5; i++) {
    const user = randomElement(users);
    const method = randomElement(['MOBILE_MONEY', 'CARD']);
    const amount = randomAmount();
    const createdAt = randomDate(7);
    const failedAt = new Date(createdAt.getTime() + Math.random() * 1800000);

    paymentsToCreate.push({
      userId: user.id,
      amount,
      currency: 'GNF',
      method,
      status: 'FAILED' as PaymentStatus,
      reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      description: `Paiement échoué via ${method}`,
      createdAt,
      failedAt,
      // ⬇️ UTILISER failureReason (champ direct)
      failureReason: randomElement([
        'Solde insuffisant',
        'Transaction annulée par l\'utilisateur',
        'Erreur réseau',
        'Timeout',
      ]),
      cinetpayTransactionId: `EVCHARGE-${Date.now()}-FAIL-${i}`,
      sessionId: null,
    });
  }

  // 5. Paiements REFUNDED (5%)
  for (let i = 0; i < 3; i++) {
    const user = randomElement(users);
    const method = randomElement(paymentMethods);
    const amount = randomAmount();
    const createdAt = randomDate(15);
    const completedAt = new Date(createdAt.getTime() + Math.random() * 3600000);
    const refundedAt = new Date(completedAt.getTime() + Math.random() * 86400000);

    paymentsToCreate.push({
      userId: user.id,
      amount,
      currency: 'GNF',
      method,
      status: 'REFUNDED' as PaymentStatus,
      reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      description: `Paiement remboursé via ${method}`,
      createdAt,
      completedAt,
      refundedAt,
      // ⬇️ UTILISER refundReason (champ direct)
      refundReason: randomElement([
        'Annulation de session',
        'Erreur de facturation',
        'Demande du client',
        'Session interrompue',
      ]),
      cinetpayTransactionId: method !== 'WALLET' ? `EVCHARGE-${Date.now()}-REF-${i}` : null,
      sessionId: null,
    });
  }

  console.log(`📝 Création de ${paymentsToCreate.length} paiements...`);

  // ⬇️ CRÉER LES PAIEMENTS ET LIER AUX SESSIONS
  for (const paymentData of paymentsToCreate) {
    const { sessionId, ...paymentFields } = paymentData;

    const payment = await prisma.payment.create({
      data: paymentFields,
    });

    // ⬇️ SI LIÉ À UNE SESSION, METTRE À JOUR LA SESSION
    if (sessionId) {
      await prisma.chargingSession.update({
        where: { id: sessionId },
        data: { paymentId: payment.id },
      });
    }
  }

  console.log(`✅ ${paymentsToCreate.length} paiements créés avec succès !`);

  const stats = {
    COMPLETED: paymentsToCreate.filter(p => p.status === 'COMPLETED').length,
    PENDING: paymentsToCreate.filter(p => p.status === 'PENDING').length,
    PROCESSING: paymentsToCreate.filter(p => p.status === 'PROCESSING').length,
    FAILED: paymentsToCreate.filter(p => p.status === 'FAILED').length,
    REFUNDED: paymentsToCreate.filter(p => p.status === 'REFUNDED').length,
  };

  console.log('\n📊 Répartition des paiements :');
  console.log(`   ✅ Complétés: ${stats.COMPLETED}`);
  console.log(`   ⏳ En attente: ${stats.PENDING}`);
  console.log(`   🔄 En traitement: ${stats.PROCESSING}`);
  console.log(`   ❌ Échoués: ${stats.FAILED}`);
  console.log(`   🔙 Remboursés: ${stats.REFUNDED}`);

  const totalAmount = paymentsToCreate.reduce((sum, p) => sum + p.amount, 0);
  console.log(`\n💰 Montant total: ${totalAmount.toLocaleString()} GNF`);
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

      // Créer le wallet
      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance,
        },
      });

      // Créer la transaction initiale
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

      console.log(`   ✅ Wallet créé pour ${user.firstName} ${user.lastName}: ${balance.toLocaleString()} GNF`);
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