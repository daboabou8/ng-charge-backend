import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { CinetpayService } from './cinetpay.service';
import { RechargeWalletDto } from '../dto/recharge-wallet.dto';
import { PaymentFiltersDto } from '../dto/payment-filters.dto';
import { CinetpayWebhookDto } from '../dto/cinetpay-webhook.dto';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private cinetpayService: CinetpayService,
  ) {}

  // ==================== WALLET OPERATIONS ====================

  async getMyWallet(userId: string) {
    return this.walletService.getOrCreateWallet(userId);
  }

  async getMyTransactions(userId: string, page = 1, limit = 20) {
    return this.walletService.getTransactions(userId, page, limit);
  }

  async rechargeWallet(userId: string, dto: RechargeWalletDto) {
    this.logger.log(`💳 Recharge wallet via CinetPay: ${userId}, ${dto.amount} GNF`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        currency: 'GNF',
        method: dto.method || PaymentMethod.MOBILE_MONEY,
        status: PaymentStatus.PENDING,
        reference: `RECHARGE-${Date.now()}`,
        description: `Recharge NG Wallet ${dto.amount} GNF`,
      },
    });

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

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        cinetpayTransactionId: cinetpayResponse.transactionId,
        cinetpayPaymentUrl: cinetpayResponse.paymentUrl,
        cinetpayPaymentToken: cinetpayResponse.paymentToken,
        status: PaymentStatus.PROCESSING,
      },
    });

    return {
      payment: updatedPayment,
      paymentUrl: cinetpayResponse.paymentUrl,
    };
  }

  // ==================== SESSION PAYMENT (PRÉPAIEMENT) ====================

  async payForSession(userId: string, sessionId: string) {
    this.logger.log(`🔋 Payment request for session: ${sessionId}`);

    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
      include: {
        station: true,
        offer: true,
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

    if (session.isPaid) {
      throw new BadRequestException(
        `Cette session a déjà été payée. Montant: ${session.cost} GNF`,
      );
    }

    // Autoriser paiement sur PENDING (prépaiement) ou COMPLETED (post-paiement)
    if (session.status !== 'PENDING' && session.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot pay session with status: ${session.status}. Session must be PENDING (prepayment) or COMPLETED (post-payment).`,
      );
    }

    // Calculer le coût
    let cost = session.cost || 0;

    if (session.status === 'PENDING') {
      this.logger.log(`💰 PENDING session - using offer price for prepayment`);

      if (session.offer?.price) {
        cost = session.offer.price;
      } else {
        const estimatedKwh = 10;
        const pricePerKwh = session.pricePerKwh || session.station.pricePerKwh || 2000;
        cost = Math.round(estimatedKwh * pricePerKwh);
        this.logger.log(`📊 Estimated cost: ${estimatedKwh} kWh * ${pricePerKwh} = ${cost} GNF`);
      }
    }

    if (session.status === 'COMPLETED' && (cost === 0 || cost === null)) {
      throw new BadRequestException(
        'Session cost is 0. Please ensure meterStop > meterStart when stopping the session.',
      );
    }

    if (cost <= 0) {
      throw new BadRequestException('Invalid session cost');
    }

    this.logger.log(`💰 Session cost: ${cost} GNF (status: ${session.status})`);

    const canAfford = await this.walletService.canAfford(userId, cost);

    if (canAfford) {
      // ✅ OPTION 1: PAYER AVEC NG WALLET
      this.logger.log(`💳 Paying with NG Wallet: ${cost} GNF`);

      const isPrepayment = session.status === 'PENDING';
      const label = isPrepayment ? '(prépaiement)' : '';

      const wallet = await this.walletService.debitWallet(
        userId,
        cost,
        `Paiement session ${label} - ${session.station.name}`,
        sessionId,
      );

      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: cost,
          currency: 'GNF',
          method: PaymentMethod.NG_WALLET,
          status: PaymentStatus.COMPLETED,
          reference: `NGWALLET-${sessionId}-${Date.now()}`,
          description: `Paiement session ${label} - ${session.station.name}`,
          completedAt: new Date(),
        },
      });

      await this.prisma.chargingSession.update({
        where: { id: sessionId },
        data: {
          isPaid: true,
          paymentId: payment.id,
          cost,
        },
      });

      this.logger.log(`✅ Payment successful with NG Wallet`);

      return {
        method: 'NG_WALLET',
        success: true,
        payment,
        walletBalance: wallet.balance,
        sessionStatus: session.status,
        message: isPrepayment
          ? 'Prépaiement effectué. La session peut maintenant être démarrée.'
          : 'Paiement effectué avec succès.',
      };
    } else {
      // ❌ OPTION 2: REDIRIGER VERS CINETPAY
      this.logger.log(`💳 Insufficient NG Wallet balance - redirecting to CinetPay`);

      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: cost,
          currency: 'GNF',
          method: PaymentMethod.MOBILE_MONEY,
          status: PaymentStatus.PENDING,
          reference: `SESSION-${sessionId}-${Date.now()}`,
          description: `Paiement session - ${session.station.name}`,
        },
      });

      await this.prisma.chargingSession.update({
        where: { id: sessionId },
        data: { paymentId: payment.id },
      });

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

      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          cinetpayTransactionId: cinetpayResponse.transactionId,
          cinetpayPaymentUrl: cinetpayResponse.paymentUrl,
          cinetpayPaymentToken: cinetpayResponse.paymentToken,
          status: PaymentStatus.PROCESSING,
        },
      });

      this.logger.log(`🔗 Redirecting to CinetPay: ${cinetpayResponse.paymentUrl}`);

      return {
        method: 'CINETPAY',
        success: false,
        payment: updatedPayment,
        paymentUrl: cinetpayResponse.paymentUrl,
        providers: ['ORANGE_MONEY', 'MTN_MONEY', 'CARD'],
        message: 'Redirection vers CinetPay pour paiement',
      };
    }
  }

  // ==================== CINETPAY WEBHOOK ====================

  async handleCinetpayWebhook(data: CinetpayWebhookDto) {
    this.logger.log(`🔔 CinetPay webhook received: ${data.cpm_trans_id}`);

    const isValid = this.cinetpayService.verifySignature(data, data.signature);

    if (!isValid) {
      this.logger.error(`❌ Invalid signature`);
      throw new BadRequestException('Invalid signature');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { cinetpayTransactionId: data.cpm_trans_id },
    });

    if (!payment) {
      this.logger.error(`❌ Payment not found: ${data.cpm_trans_id}`);
      throw new NotFoundException('Payment not found');
    }

    const status = await this.cinetpayService.checkPaymentStatus(data.cpm_trans_id);

    if (status.status === 'ACCEPTED' || status.status === 'COMPLETE') {
      this.logger.log(`✅ Payment successful: ${data.cpm_trans_id}`);

      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          cinetpayOperator: data.payment_method,
          completedAt: new Date(),
        },
      });

      if (payment.description?.includes('Recharge NG Wallet')) {
        this.logger.log(`💰 Crediting wallet: ${payment.amount} GNF`);

        await this.walletService.creditWallet(
          payment.userId,
          payment.amount,
          'Recharge via CinetPay',
          payment.id,
        );
      }

      const session = await this.prisma.chargingSession.findFirst({
        where: { paymentId: payment.id },
      });

      if (session) {
        this.logger.log(`✅ Marking session as paid: ${session.id}`);

        await this.prisma.chargingSession.update({
          where: { id: session.id },
          data: { isPaid: true },
        });
      }

      return { success: true, payment: updatedPayment };
    } else {
      this.logger.error(`❌ Payment failed: ${data.cpm_trans_id}`);

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: data.cpm_error_message || 'Payment rejected',
        },
      });

      return { success: false, message: 'Payment failed' };
    }
  }

  // ==================== USER PAYMENTS ====================

  async getMyPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
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

  // ==================== ADMIN ====================

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

    const session = await this.prisma.chargingSession.findFirst({
      where: { paymentId: payment.id },
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

    return {
      ...payment,
      session: session || null,
    };
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
      this.prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.COMPLETED } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.REFUNDED } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.CANCELLED } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.REFUNDED },
        _sum: { amount: true },
      }),
    ]);

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
      averageAmount:
        completed > 0
          ? Math.round((completedAmountResult._sum.amount || 0) / completed)
          : 0,
      chartData,
    };
  }

  private async getRevenueChartData(days: number) {
    const result: { date: string; revenue: number; sessions: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const [payments, sessions] = await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            status: PaymentStatus.COMPLETED,
            createdAt: { gte: date, lt: nextDay },
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.count({
          where: {
            status: PaymentStatus.COMPLETED,
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

  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Vérifier d'abord REFUNDED, puis COMPLETED — ordre important pour TypeScript
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Payment already refunded');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: reason || 'Remboursement administrateur',
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
      },
    });

    if (
      payment.method === PaymentMethod.NG_WALLET ||
      payment.method === PaymentMethod.WALLET
    ) {
      this.logger.log(`🔄 Refunding NG Wallet: ${payment.amount} GNF`);

      await this.walletService.refundWallet(payment.userId, payment.amount, payment.id);
    }

    const session = await this.prisma.chargingSession.findFirst({
      where: { paymentId: payment.id },
    });

    if (session) {
      await this.prisma.chargingSession.update({
        where: { id: session.id },
        data: {
          isPaid: false,
          paymentId: null,
        },
      });
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: payments,
      total: payments.length,
      exportedAt: new Date().toISOString(),
    };
  }
}
