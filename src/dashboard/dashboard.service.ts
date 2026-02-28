import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // Statistiques utilisateurs
    const [totalUsers, activeUsers, adminCount, operatorCount, userCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { role: 'OPERATOR' } }),
      this.prisma.user.count({ where: { role: 'USER' } }),
    ]);

    // Statistiques bornes
    const [totalStations, available, occupied, maintenance, outOfService] = await Promise.all([
      this.prisma.chargingStation.count(),
      this.prisma.chargingStation.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.chargingStation.count({ where: { status: 'OCCUPIED' } }),
      this.prisma.chargingStation.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.chargingStation.count({ where: { status: 'OUT_OF_SERVICE' } }),
    ]);

    // Statistiques sessions
    const [totalSessions, completedSessions, activeSessions, failedSessions] = await Promise.all([
      this.prisma.chargingSession.count(),
      this.prisma.chargingSession.count({ where: { status: 'COMPLETED' } }),
      this.prisma.chargingSession.count({ where: { status: 'ACTIVE' } }),
      this.prisma.chargingSession.count({ where: { status: 'FAILED' } }),
    ]);

    // Statistiques paiements
    const [totalPayments, completedPayments, paymentAmounts] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: {
        totalUsers,
        activeUsers,
        adminCount,
        operatorCount,
        userCount,
      },
      stations: {
        total: totalStations,
        available,
        occupied,
        maintenance,
        outOfService,
      },
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        active: activeSessions,
        failed: failedSessions,
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        totalAmount: paymentAmounts._sum.amount || 0,
      },
    };
  }

  async getRevenueChart() {
    // Derniers 7 jours
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const data = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const [payments, sessions] = await Promise.all([
          this.prisma.payment.aggregate({
            where: {
              status: 'COMPLETED',
              createdAt: {
                gte: date,
                lt: nextDay,
              },
            },
            _sum: { amount: true },
          }),
          this.prisma.chargingSession.count({
            where: {
              status: 'COMPLETED',
              createdAt: {
                gte: date,
                lt: nextDay,
              },
            },
          }),
        ]);

        return {
          date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          revenue: payments._sum.amount || 0,
          sessions,
        };
      }),
    );

    return data;
  }

  async getSessionsChart() {
    // Derniers 7 jours
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const data = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const [completed, active, failed] = await Promise.all([
          this.prisma.chargingSession.count({
            where: {
              status: 'COMPLETED',
              createdAt: { gte: date, lt: nextDay },
            },
          }),
          this.prisma.chargingSession.count({
            where: {
              status: 'ACTIVE',
              createdAt: { gte: date, lt: nextDay },
            },
          }),
          this.prisma.chargingSession.count({
            where: {
              status: 'FAILED',
              createdAt: { gte: date, lt: nextDay },
            },
          }),
        ]);

        return {
          date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          completed,
          active,
          failed,
        };
      }),
    );

    return data;
  }

  async getRecentActivities() {
    // Sessions récentes
    const recentSessions = await this.prisma.chargingSession.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
        station: {
          select: { name: true },
        },
      },
    });

    // Paiements récents (recharges wallet)
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        reference: { startsWith: 'WALLET-RECHARGE' },
      },
      take: 2,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const activities = [
      ...recentSessions.map((session) => ({
        id: session.id,
        user: `${session.user.firstName} ${session.user.lastName}`,
        action:
          session.status === 'ACTIVE'
            ? 'a démarré une session'
            : session.status === 'COMPLETED'
            ? 'a terminé une session'
            : 'session échouée',
        station: session.station.name,
        time: this.getRelativeTime(session.createdAt),
        status: session.status === 'COMPLETED' ? 'success' : session.status === 'FAILED' ? 'error' : 'info',
      })),
      ...recentPayments.map((payment) => ({
        id: payment.id,
        user: `${payment.user.firstName} ${payment.user.lastName}`,
        action: 'a rechargé son wallet',
        station: `${payment.amount.toLocaleString()} GNF`,
        time: this.getRelativeTime(payment.createdAt),
        status: 'info',
      })),
    ];

    // Trier par date décroissante
    return activities.sort((a, b) => {
      // Conversion approximative pour le tri
      const timeToMinutes = (timeStr: string): number => {
        if (timeStr.includes('min')) return parseInt(timeStr);
        if (timeStr.includes('heure')) return parseInt(timeStr) * 60;
        if (timeStr.includes('jour')) return parseInt(timeStr) * 1440;
        return 0;
      };
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    }).slice(0, 7);
  }

  async getStationsMap() {
    const stations = await this.prisma.chargingStation.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
        power: true,
        pricePerKwh: true,
        _count: {
          select: {
            sessions: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    return stations.map((station) => ({
      id: station.id,
      name: station.name,
      lat: station.latitude,
      lng: station.longitude,
      status: station.status,
      power: station.power,
      pricePerKwh: station.pricePerKwh,
      activeSessions: station._count.sessions,
    }));
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }
}