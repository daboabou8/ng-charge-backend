import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { CinetpayService } from './cinetpay.service';
import { RechargeWalletDto } from '../dto/recharge-wallet.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentFiltersDto } from '../dto/payment-filters.dto';
import { CinetpayWebhookDto } from '../dto/cinetpay-webhook.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private cinetpayService: CinetpayService,
  ) {}

  // ==================== WALLET OPERATIONS ====================

  async getMyWallet(userId: string) {
    return this.walletService.getOrCreateWallet(userId);
  }

  async getMyTransactions(userId: string, page: number = 1, limit: number = 20) {
    return this.walletService.getTransactions(userId, page, limit);
  }

  async rechargeWallet(userId: string, dto: RechargeWalletDto) {
    // Obtenir les infos utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Créer le paiement
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        currency: 'GNF',
        method: dto.method || 'MOBILE_MONEY',
        status: 'PENDING',
        reference: `RECHARGE-${Date.now()}`,
        description: `Recharge NG Wallet ${dto.amount} GNF`,
      },
    });

    // Initier le paiement Cinetpay
    const cinetpayResponse = await this.cinetpayService.initiatePayment(
      dto.amount,
      userId,
      `Recharge NG Wallet`,
      {
        customerName: user.firstName,
        customerSurname: user.lastName,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerCity: user.profile?.city || 'Conakry',
        paymentId: payment.id,
      },
    );

    // Mettre à jour le paiement avec les infos Cinetpay
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        cinetpayTransactionId: cinetpayResponse.transactionId,
        cinetpayPaymentUrl: cinetpayResponse.paymentUrl,
        cinetpayPaymentToken: cinetpayResponse.paymentToken,
        status: 'PROCESSING',
      },
    });

    return {
      payment: updatedPayment,
      paymentUrl: cinetpayResponse.paymentUrl,
    };
  }

  // ==================== SESSION PAYMENT ====================

  async payForSession(userId: string, sessionId: string) {
    // Récupérer la session
    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
      include: {
        station: true,
        user: {
          include: { profile: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new BadRequestException('Not your session');
    }

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException('Session not completed yet');
    }

    if (session.isPaid) {
      throw new BadRequestException('Session already paid');
    }

    const cost = session.cost || 0;

    if (cost === 0 || cost === null) {
    throw new BadRequestException(
        'Session cost is 0. Please make sure meterStop > meterStart when stopping the session.',
    );
    }

    // Vérifier le solde NG Wallet
    const canAfford = await this.walletService.canAfford(userId, cost);

    if (canAfford) {
      // OPTION 1: Payer avec NG Wallet (PRIORITAIRE)
      const { wallet, transaction } = await this.walletService.debit(
        userId,
        cost,
        `Paiement session de recharge - ${session.station.name}`,
        sessionId,
      );

      // Créer le paiement
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: cost,
          currency: 'GNF',
          method: 'WALLET',
          status: 'COMPLETED',
          reference: `SESSION-${sessionId}-${Date.now()}`,
          description: `Paiement session - ${session.station.name}`,
          completedAt: new Date(),
        },
      });

      // Marquer la session comme payée
      await this.prisma.chargingSession.update({
        where: { id: sessionId },
        data: {
          isPaid: true,
          paymentId: payment.id,
        },
      });

      return {
        method: 'NG_WALLET',
        success: true,
        payment,
        walletBalance: wallet.balance,
        transaction,
      };
    } else {
      // OPTION 2: Payer avec Cinetpay (Orange Money, MTN, Carte)
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: cost,
          currency: 'GNF',
          method: 'MOBILE_MONEY',
          status: 'PENDING',
          reference: `SESSION-${sessionId}-${Date.now()}`,
          description: `Paiement session - ${session.station.name}`,
        },
      });

      // Lier le paiement à la session
      await this.prisma.chargingSession.update({
        where: { id: sessionId },
        data: { paymentId: payment.id },
      });

      // Initier le paiement Cinetpay
      const cinetpayResponse = await this.cinetpayService.initiatePayment(
        cost,
        userId,
        `Paiement session de recharge`,
        {
          customerName: session.user.firstName,
          customerSurname: session.user.lastName,
          customerEmail: session.user.email,
          customerPhone: session.user.phone,
          customerCity: session.user.profile?.city || 'Conakry',
          sessionId,
          paymentId: payment.id,
        },
      );

      // Mettre à jour le paiement
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          cinetpayTransactionId: cinetpayResponse.transactionId,
          cinetpayPaymentUrl: cinetpayResponse.paymentUrl,
          cinetpayPaymentToken: cinetpayResponse.paymentToken,
          status: 'PROCESSING',
        },
      });

      return {
        method: 'CINETPAY',
        success: false,
        payment: updatedPayment,
        paymentUrl: cinetpayResponse.paymentUrl,
        providers: ['ORANGE_MONEY', 'MTN_MONEY', 'CARD'],
      };
    }
  }

  // ==================== CINETPAY WEBHOOK ====================

  async handleCinetpayWebhook(data: CinetpayWebhookDto) {
    // Vérifier la signature
    const isValid = this.cinetpayService.verifySignature(data, data.signature);

    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Trouver le paiement
    const payment = await this.prisma.payment.findUnique({
      where: { cinetpayTransactionId: data.cpm_trans_id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Vérifier le statut du paiement sur Cinetpay
    const status = await this.cinetpayService.checkPaymentStatus(data.cpm_trans_id);

    if (status.status === 'ACCEPTED' || status.status === 'COMPLETE') {
      // Paiement réussi
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          cinetpayOperator: data.payment_method,
          completedAt: new Date(),
        },
      });

      // Si c'est une recharge wallet, créditer le wallet
      if (payment.description?.includes('Recharge NG Wallet')) {
        await this.walletService.credit(
          payment.userId,
          payment.amount,
          'Recharge via Cinetpay',
          payment.id,
        );
      }

      // Si c'est un paiement de session, marquer comme payée
      const session = await this.prisma.chargingSession.findFirst({
        where: { paymentId: payment.id },
      });

      if (session) {
        await this.prisma.chargingSession.update({
          where: { id: session.id },
          data: { isPaid: true },
        });
      }

      return { success: true, payment: updatedPayment };
    } else {
      // Paiement échoué
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
        },
      });

      return { success: false, message: 'Payment failed' };
    }
  }

  // ==================== ADMIN ROUTES ====================

  async findAll(dto: PaymentFiltersDto) {
    const { page = 1, limit = 20, status, method, userId, startDate, endDate } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (method) where.method = method;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          sessions: {
            select: {
              id: true,
              stationId: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

async findOne(id: string) {
  console.log('🔍 Recherche du paiement:', id);

  // Charger le paiement
  const payment = await this.prisma.payment.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!payment) {
    throw new NotFoundException('Payment not found');
  }

  console.log('✅ Paiement trouvé:', payment.reference);

  // Charger la session liée
  const session = await this.prisma.chargingSession.findFirst({
    where: {
      paymentId: payment.id,
    },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
        },
      },
    },
  });

  console.log('📍 Session trouvée:', session ? session.id : 'AUCUNE');

  // Retourner le paiement avec la session
  const result = {
    ...payment,
    session: session || null,
  };

  console.log('📦 Résultat final:', JSON.stringify(result, null, 2));

  return result;
}

async getStats() {
  const [
    total,
    pending,
    completed,
    failed,
    refunded,
    cancelled,
    totalAmountResult,
    completedAmountResult,
    refundedAmountResult,
  ] = await Promise.all([
    this.prisma.payment.count(),
    this.prisma.payment.count({ where: { status: 'PENDING' } }),
    this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
    this.prisma.payment.count({ where: { status: 'FAILED' } }),
    this.prisma.payment.count({ where: { status: 'REFUNDED' } }),
    this.prisma.payment.count({ where: { status: 'CANCELLED' } }),
    this.prisma.payment.aggregate({
      _sum: { amount: true },
    }),
    this.prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    this.prisma.payment.aggregate({
      where: { status: 'REFUNDED' },
      _sum: { amount: true },
    }),
  ]);

  // ⬇️ AJOUTER CHARTDATA POUR LES 7 DERNIERS JOURS
  const chartData = await this.getRevenueChartData(7);

  return {
    total,
    pending,
    completed,
    failed,
    refunded,
    cancelled,
    totalAmount: totalAmountResult._sum.amount || 0,
    completedAmount: completedAmountResult._sum.amount || 0,
    refundedAmount: refundedAmountResult._sum.amount || 0,
    averageAmount: completed > 0 ? Math.round((completedAmountResult._sum.amount || 0) / completed) : 0,
    chartData, // ⬅️ AJOUTER LES DONNÉES DU GRAPHIQUE
  };
}

// ⬇️ AJOUTER CETTE NOUVELLE MÉTHODE À LA FIN DE LA CLASSE
private async getRevenueChartData(days: number) {
  const result = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const [payments, sessions] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: date, lt: nextDay },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: date, lt: nextDay },
        },
      }),
    ]);

    result.push({
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      revenue: payments._sum.amount || 0,
      sessions,
    });
  }

  return result;
}

private async getRevenueChartData(days: number) {
  const result = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const [payments, sessions] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: date, lt: nextDay },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: date, lt: nextDay },
        },
      }),
    ]);

    result.push({
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      revenue: payments._sum.amount || 0,
      sessions,
    });
  }

  return result;
}

  async getMyPayments(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          sessions: {
            select: {
              id: true,
              stationId: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== ADMIN REFUND & EXPORT ====================

async refundPayment(paymentId: string, reason?: string) {
  const payment = await this.prisma.payment.findUnique({
    where: { id: paymentId },
    include: { 
      user: true,
      sessions: true,
    },
  });

  if (!payment) {
    throw new NotFoundException('Payment not found');
  }

  if (payment.status !== 'COMPLETED') {
    throw new BadRequestException('Only completed payments can be refunded');
  }

  if (payment.status === 'REFUNDED') {
    throw new BadRequestException('Payment already refunded');
  }

  // ⬇️ METTRE À JOUR AVEC refundReason (champ direct, pas metadata)
  const refundedPayment = await this.prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundReason: reason || 'Remboursement administrateur', // ⬅️ Champ direct
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      sessions: {
        include: {
          station: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
      },
    },
  });

  // Rembourser le wallet si c'était un paiement WALLET
  if (payment.method === 'WALLET') {
    await this.walletService.refund(
      payment.userId,
      payment.amount,
      `Remboursement paiement ${payment.reference || payment.id}${reason ? ` - ${reason}` : ''}`,
      payment.sessions?.[0]?.id,
    );
  }

  // Si le paiement était lié à une session, marquer comme non payée
  if (payment.sessions && payment.sessions.length > 0) {
    for (const session of payment.sessions) {
      await this.prisma.chargingSession.update({
        where: { id: session.id },
        data: {
          isPaid: false,
          paymentId: null,
        },
      });
    }
  }

  return refundedPayment;
}

async exportPayments(dto: PaymentFiltersDto) {
  const { status, method, userId, startDate, endDate } = dto;

  const where: any = {};

  if (status) where.status = status;
  if (method) where.method = method;
  if (userId) where.userId = userId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const payments = await this.prisma.payment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      sessions: {
        select: {
          id: true,
          stationId: true,
          status: true,
          energyConsumed: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Retourner les données pour export (le frontend gérera le CSV)
  return {
    data: payments,
    total: payments.length,
    exportedAt: new Date().toISOString(),
  };
}
}