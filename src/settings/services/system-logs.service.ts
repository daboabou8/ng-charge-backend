import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetLogsDto } from '../dto/get-logs.dto';
import { LogLevel, LogCategory } from '@prisma/client';

@Injectable()
export class SystemLogsService {
  constructor(private prisma: PrismaService) {}

  // Liste des logs avec filtres
  async findAll(dto: GetLogsDto) {
    const { page = 1, limit = 20, level, category, userId, startDate, endDate } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (level) where.level = level;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Créer un log
  async create(data: {
    level: LogLevel;
    category: LogCategory;
    message: string;
    userId?: string;
    details?: any;
    stackTrace?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
  }) {
    return this.prisma.systemLog.create({
      data,
    });
  }

  // Log INFO
  async info(
    category: LogCategory,
    message: string,
    details?: any,
    userId?: string
  ) {
    return this.create({
      level: 'INFO',
      category,
      message,
      details,
      userId,
    });
  }

  // Log WARN
  async warn(
    category: LogCategory,
    message: string,
    details?: any,
    userId?: string
  ) {
    return this.create({
      level: 'WARN',
      category,
      message,
      details,
      userId,
    });
  }

  // Log ERROR
  async error(
    category: LogCategory,
    message: string,
    error?: Error,
    userId?: string
  ) {
    return this.create({
      level: 'ERROR',
      category,
      message,
      details: error ? { error: error.message } : undefined,
      stackTrace: error?.stack,
      userId,
    });
  }

  // Log CRITICAL
  async critical(
    category: LogCategory,
    message: string,
    error?: Error,
    userId?: string
  ) {
    return this.create({
      level: 'CRITICAL',
      category,
      message,
      details: error ? { error: error.message } : undefined,
      stackTrace: error?.stack,
      userId,
    });
  }

  // Statistiques des logs
  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, byLevel, byCategory] = await Promise.all([
      this.prisma.systemLog.count({ where }),
      this.prisma.systemLog.groupBy({
        by: ['level'],
        where,
        _count: true,
      }),
      this.prisma.systemLog.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byLevel: byLevel.map((item) => ({
        level: item.level,
        count: item._count,
      })),
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
    };
  }

  // Supprimer les vieux logs
  async deleteOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      message: `${result.count} logs supprimés (plus anciens que ${daysToKeep} jours)`,
      count: result.count,
    };
  }

  // Exporter les logs (CSV)
  async exportLogs(dto: GetLogsDto) {
    const { data } = await this.findAll({ ...dto, limit: 10000 }); // Max 10k logs

    const csv = [
      ['Date', 'Level', 'Category', 'User', 'Message', 'Details'].join(';'),
      ...data.map((log) =>
        [
          log.createdAt.toISOString(),
          log.level,
          log.category,
          log.user?.email || 'System',
          log.message,
          JSON.stringify(log.details || {}),
        ].join(';')
      ),
    ].join('\n');

    return csv;
  }
}