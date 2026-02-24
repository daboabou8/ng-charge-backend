import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // ==================== USER ROUTES ====================

 async create(userId: string, dto: CreateSessionDto) {
  // Vérifier que la station existe
  const station = await this.prisma.chargingStation.findUnique({
    where: { id: dto.stationId },
  });

  if (!station) {
    throw new NotFoundException('Station not found');
  }

  // Vérifier que la station est disponible
  if (station.status !== 'AVAILABLE') {
    throw new BadRequestException(`Station is ${station.status.toLowerCase()}`);
  }

  // Vérifier qu'il n'y a pas déjà une session active
  const activeSession = await this.prisma.chargingSession.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
  });

  if (activeSession) {
    throw new BadRequestException('You already have an active charging session');
  }

  // Récupérer l'offre si fournie
  let offer = null;
  if (dto.offerId) {
    offer = await this.prisma.chargingOffer.findUnique({
      where: { id: dto.offerId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (!offer.isActive) {
      throw new BadRequestException('This offer is not available');
    }
  }

  // Créer la session avec l'offre
  const session = await this.prisma.chargingSession.create({
    data: {
      userId,
      stationId: dto.stationId,
      connectorId: dto.connectorId,
      meterStart: dto.meterStart || 0,
      status: 'PENDING',
      pricePerKwh: offer ? offer.pricePerKwh || offer.price / (offer.power * (offer.duration / 60)) : station.pricePerKwh,
    },
    include: {
      station: true,
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

  return {
    session,
    selectedOffer: offer,
    estimatedDuration: offer?.duration,
    estimatedCost: offer?.price,
  };
}

  async startSession(sessionId: string, userId: string) {
    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (session.status !== 'PENDING') {
      throw new BadRequestException('Session cannot be started');
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.chargingSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        startTime: new Date(),
      },
      include: {
        station: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Mettre à jour le statut de la station
    await this.prisma.chargingStation.update({
      where: { id: session.stationId },
      data: { status: 'OCCUPIED' },
    });

    return updatedSession;
  }

  async stopSession(sessionId: string, userId: string, dto?: UpdateSessionDto) {
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

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Session is not active');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000); // Secondes

    // Calculer l'énergie consommée
    const meterStop = dto?.meterStop || session.meterStart;
    const energyConsumed = (meterStop - (session.meterStart || 0)) / 1000; // kWh

    // Calculer le coût
    const cost = energyConsumed * (session.pricePerKwh || session.station.pricePerKwh);

    // Mettre à jour la session
    const updatedSession = await this.prisma.chargingSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime,
        duration,
        meterStop,
        energyConsumed,
        cost: Math.round(cost),
        stopReason: dto?.stopReason || 'User stopped',
      },
      include: {
        station: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Libérer la station
    await this.prisma.chargingStation.update({
      where: { id: session.stationId },
      data: { status: 'AVAILABLE' },
    });

    // TODO: Envoyer commande OCPP à CitrineOS pour arrêter la charge
    // await this.citrineos.remoteStopTransaction(...)

    return updatedSession;
  }

  async findMyActiveSessions(userId: string) {
    const sessions = await this.prisma.chargingSession.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        station: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return sessions;
  }

  async findMyHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.chargingSession.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              reference: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.chargingSession.count({ where: { userId } }),
    ]);

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const session = await this.prisma.chargingSession.findUnique({
      where: { id },
      include: {
        station: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        payment: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier les permissions
    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return session;
  }

  // ==================== ADMIN ROUTES ====================

  async findAll(dto: SessionFiltersDto) {
    const { page = 1, limit = 20, status, stationId, userId, startDate, endDate } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (stationId) {
      where.stationId = stationId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [sessions, total] = await Promise.all([
      this.prisma.chargingSession.findMany({
        where,
        skip,
        take: limit,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.chargingSession.count({ where }),
    ]);

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [total, active, completed, failed, cancelled, totalEnergy, totalRevenue] =
      await Promise.all([
        this.prisma.chargingSession.count(),
        this.prisma.chargingSession.count({ where: { status: 'ACTIVE' } }),
        this.prisma.chargingSession.count({ where: { status: 'COMPLETED' } }),
        this.prisma.chargingSession.count({ where: { status: 'FAILED' } }),
        this.prisma.chargingSession.count({ where: { status: 'CANCELLED' } }),
        this.prisma.chargingSession.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { energyConsumed: true },
        }),
        this.prisma.chargingSession.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { cost: true },
        }),
      ]);

    return {
      total,
      active,
      completed,
      failed,
      cancelled,
      totalEnergy: totalEnergy._sum.energyConsumed || 0,
      totalRevenue: totalRevenue._sum.cost || 0,
    };
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
}