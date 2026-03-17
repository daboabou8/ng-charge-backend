import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../payments/services/wallet.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  // ==================== CREATE SESSION ====================

  async create(userId: string, dto: CreateSessionDto) {
    this.logger.log(`🔋 Creating session for user ${userId} at station ${dto.stationId}`);

    const station = await this.prisma.chargingStation.findUnique({
      where: { id: dto.stationId },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    // Vérifier que le connecteur n'est pas déjà utilisé
    const activeOnConnector = await this.prisma.chargingSession.findFirst({
      where: {
        stationId: dto.stationId,
        connectorId: dto.connectorId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (activeOnConnector) {
      throw new BadRequestException(`Connector ${dto.connectorId} is currently in use`);
    }

    // Vérifier qu'il n'y a pas déjà une session active
    const activeSession = await this.prisma.chargingSession.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (activeSession) {
      throw new BadRequestException('You already have an active charging session');
    }

    // Récupérer et valider l'offre
    let offer: Awaited<ReturnType<typeof this.prisma.chargingOffer.findUnique>> | null = null;
    let pricePerKwh = station.pricePerKwh;

    if (dto.offerId) {
      offer = await this.prisma.chargingOffer.findUnique({
        where: { id: dto.offerId },
      });

      if (!offer || !offer.isActive) {
        throw new NotFoundException('Offer not found or inactive');
      }

      pricePerKwh = offer.pricePerKwh || station.pricePerKwh;
    }

    const session = await this.prisma.chargingSession.create({
      data: {
        userId,
        stationId: dto.stationId,
        connectorId: dto.connectorId,
        offerId: dto.offerId,
        status: 'PENDING',
        pricePerKwh,
        isPaid: false,
      },
      include: {
        station: true,
        offer: true,
      },
    });

    this.logger.log(`✅ Session created: ${session.id}`);

    return {
      session,
      selectedOffer: offer,
      estimatedDuration: offer?.duration,
      estimatedCost: offer?.price,
    };
  }

  // ==================== START SESSION ====================

  async startSession(sessionId: string, userId: string) {
    this.logger.log(`▶️ Starting session: ${sessionId}`);

    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
      include: { station: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (!session.isPaid) {
      throw new BadRequestException(
        'Session must be paid before starting. Please complete payment first.',
      );
    }

    if (session.status !== 'PENDING') {
      throw new BadRequestException(
        `Session cannot be started. Current status: ${session.status}`,
      );
    }

    // TODO: Envoyer RemoteStart à CitrineOS
    // await this.citrineos.remoteStartTransaction(...)

    const updatedSession = await this.prisma.chargingSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        startTime: new Date(),
        meterStart: 0, // TODO: Obtenir de CitrineOS
      },
      include: {
        station: true,
        offer: true,
      },
    });

    this.logger.log(`✅ Session started: ${session.id}`);

    return updatedSession;
  }

  // ==================== STOP SESSION (AVEC REMBOURSEMENT) ====================

  async stopSession(sessionId: string, userId: string, dto?: UpdateSessionDto) {
    this.logger.log(`🛑 Stopping session: ${sessionId}`);

    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
      include: {
        station: true,
        payment: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Session is not active');
    }

    // TODO: Envoyer RemoteStop à CitrineOS
    // const meterStop = await this.citrineos.remoteStopTransaction(...)

    const meterStart = session.meterStart || 0;
    // Utiliser meterStop du dto si fourni (test/admin), sinon simuler
    const meterStop =
      dto?.meterStop ??
      meterStart + Math.floor(Math.random() * 15000) + 5000; // 5–20 kWh simulé

    const energyConsumed = (meterStop - meterStart) / 1000; // Wh → kWh
    const pricePerKwh = session.pricePerKwh || session.station.pricePerKwh;
    const realCost = Math.round(energyConsumed * pricePerKwh);

    this.logger.log(`⚡ Energy: ${energyConsumed.toFixed(2)} kWh, Cost: ${realCost} GNF`);

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - new Date(session.startTime).getTime()) / 1000,
    );

    const updatedSession = await this.prisma.chargingSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime,
        meterStop,
        energyConsumed,
        cost: realCost,
        duration,
        stopReason: dto?.stopReason || 'User stopped',
      },
      include: {
        station: true,
        offer: true,
        payment: true,
      },
    });

    // ========== REMBOURSEMENT SI NÉCESSAIRE ==========
    let refund = null;

    if (session.payment && session.isPaid) {
      const paidAmount = session.payment.amount;

      if (realCost < paidAmount) {
        const refundAmount = paidAmount - realCost;

        this.logger.log(
          `🔄 Refunding ${refundAmount} GNF (Paid: ${paidAmount}, Consumed: ${realCost})`,
        );

        await this.walletService.creditWallet(
          userId,
          refundAmount,
          `Remboursement session ${sessionId.substring(0, 8)} - Payé: ${paidAmount} GNF, Consommé: ${realCost} GNF`,
          sessionId,
        );

        await this.prisma.payment.create({
          data: {
            userId,
            amount: refundAmount,
            currency: 'GNF',
            method: 'NG_WALLET',
            status: 'COMPLETED',
            reference: `REFUND-${sessionId}-${Date.now()}`,
            description: `Remboursement session - Trop-perçu: ${refundAmount} GNF`,
            completedAt: new Date(),
          },
        });

        refund = { amount: refundAmount, paidAmount, realCost };
      }
    }

    this.logger.log(`✅ Session stopped: ${session.id}`);

    return { session: updatedSession, refund };
  }

  // ==================== USER SESSIONS ====================

  async findMyActiveSessions(userId: string) {
    return this.prisma.chargingSession.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { station: true, offer: true },
      orderBy: { startTime: 'desc' },
    });
  }

  async findMyHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.chargingSession.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          station: {
            select: { id: true, name: true, address: true, city: true },
          },
          offer: {
            select: { id: true, name: true, price: true },
          },
          payment: {
            select: { id: true, amount: true, method: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.chargingSession.count({ where: { userId } }),
    ]);

    return {
      data: sessions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== FIND ONE ====================

  async findOne(id: string, userId?: string) {
    const session = await this.prisma.chargingSession.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        station: true,
        offer: true,
        payment: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return session;
  }

  // ==================== ADMIN ====================

  async findAll(dto: SessionFiltersDto) {
    const { page = 1, limit = 20, status, stationId, userId, startDate, endDate } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (stationId) where.stationId = stationId;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [sessions, total] = await Promise.all([
      this.prisma.chargingSession.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          station: {
            select: { id: true, name: true, address: true, city: true },
          },
          offer: {
            select: { id: true, name: true, price: true },
          },
          payment: {
            select: { id: true, amount: true, method: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.chargingSession.count({ where }),
    ]);

    return {
      data: sessions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [
      total,
      pending,
      active,
      completed,
      failed,
      cancelled,
      stopped,
      totalEnergyResult,
      totalRevenueResult,
      durationResult,
    ] = await Promise.all([
      this.prisma.chargingSession.count(),
      this.prisma.chargingSession.count({ where: { status: 'PENDING' } }),
      this.prisma.chargingSession.count({ where: { status: 'ACTIVE' } }),
      this.prisma.chargingSession.count({ where: { status: 'COMPLETED' } }),
      this.prisma.chargingSession.count({ where: { status: 'FAILED' } }),
      this.prisma.chargingSession.count({ where: { status: 'CANCELLED' } }),
      this.prisma.chargingSession.count({ where: { status: 'STOPPED' } }),
      this.prisma.chargingSession.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { energyConsumed: true },
      }),
      this.prisma.chargingSession.aggregate({
        where: { status: 'COMPLETED', isPaid: true },
        _sum: { cost: true },
      }),
      this.prisma.chargingSession.aggregate({
        where: { status: 'COMPLETED' },
        _avg: { duration: true },
      }),
    ]);

    const chartData = await this.getChartData(7);

    return {
      total,
      pending,
      active,
      completed,
      failed,
      cancelled,
      stopped,
      totalEnergy: totalEnergyResult._sum.energyConsumed || 0,
      totalRevenue: totalRevenueResult._sum.cost || 0,
      averageDuration: Math.round(durationResult._avg.duration || 0),
      chartData,
    };
  }

  private async getChartData(days: number) {
    const result: {
      date: string;
      sessions: number;
      energy: number;
      revenue: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const [sessions, energy, revenue] = await Promise.all([
        this.prisma.chargingSession.count({
          where: { status: 'COMPLETED', createdAt: { gte: date, lt: nextDay } },
        }),
        this.prisma.chargingSession.aggregate({
          where: { status: 'COMPLETED', createdAt: { gte: date, lt: nextDay } },
          _sum: { energyConsumed: true },
        }),
        this.prisma.chargingSession.aggregate({
          where: { status: 'COMPLETED', isPaid: true, createdAt: { gte: date, lt: nextDay } },
          _sum: { cost: true },
        }),
      ]);

      result.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        sessions,
        energy: energy._sum.energyConsumed || 0,
        revenue: revenue._sum.cost || 0,
      });
    }

    return result;
  }

  async adminStopSession(sessionId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.stopSession(sessionId, session.userId, dto);
  }

  async update(id: string, dto: UpdateSessionDto) {
    const session = await this.prisma.chargingSession.findUnique({ where: { id } });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.chargingSession.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const session = await this.prisma.chargingSession.findUnique({ where: { id } });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.chargingSession.delete({ where: { id } });
  }
}
