import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { SearchStationsDto } from './dto/search-stations.dto';
import { QrCodeService } from './qrcode.service';
@Injectable()
export class StationsService {
  constructor(
    private prisma: PrismaService,
    private qrCodeService: QrCodeService,
  ) { }

  // ==================== PUBLIC ROUTES ====================

  async findAll(dto: SearchStationsDto) {
    const { page = 1, limit = 20, latitude, longitude, radius, status, connectorType, city, code, search } = dto;
    const skip = (page - 1) * limit;

    // Construire les filtres
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (connectorType) {
      where.connectorType = connectorType;
    }

    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    if (code) {
      where.code = code;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Recherche par distance (Req 1-2)
    let stations = [];
    let total = 0;

    if (latitude && longitude && radius) {
      // Formule Haversine pour calculer la distance
      const allStations = await this.prisma.chargingStation.findMany({
        where,
        include: {
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              sessions: true,
              reviews: true,
            },
          },
        },
      });

      // Filtrer par distance
      stations = allStations
        .map((station) => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            station.latitude,
            station.longitude,
          );

          return {
            ...station,
            distance: Math.round(distance * 10) / 10, // Arrondir à 1 décimale
          };
        })
        .filter((station) => station.distance <= radius)
        .sort((a, b) => a.distance - b.distance) // Trier par distance
        .slice(skip, skip + limit);

      total = stations.length;
    } else {
      // Requête normale sans distance
      [stations, total] = await Promise.all([
        this.prisma.chargingStation.findMany({
          skip,
          take: limit,
          where,
          include: {
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
            _count: {
              select: {
                sessions: true,
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.chargingStation.count({ where }),
      ]);
    }

    // Calculer la note moyenne pour chaque borne
    const stationsWithRatings = stations.map((station: any) => {
      const avgRating =
        station.reviews.length > 0
          ? station.reviews.reduce((sum, r) => sum + r.rating, 0) / station.reviews.length
          : 0;

      return {
        ...station,
        averageRating: Math.round(avgRating * 10) / 10,
        reviews: undefined, // Ne pas retourner tous les reviews
      };
    });

    return {
      data: stationsWithRatings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profile: {
                  select: {
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            sessions: true,
            reviews: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    // Calculer la note moyenne
    const avgRating =
      station.reviews.length > 0
        ? station.reviews.reduce((sum, r) => sum + r.rating, 0) / station.reviews.length
        : 0;

    return {
      ...station,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }

  async findByCode(code: string) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { code },
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    return station;
  }

  async findByQrCode(qrCode: string) {
    const station = await this.prisma.chargingStation.findFirst({
      where: { qrCode },
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    return station;
  }

  // ==================== ADMIN/OPERATOR ROUTES ====================

async create(dto: CreateStationDto) {
  // Vérifier si le stationId existe déjà
  const existing = await this.prisma.chargingStation.findUnique({
    where: { stationId: dto.stationId },
  });

  if (existing) {
    throw new ConflictException('Station ID already exists');
  }

  // Vérifier si le code existe déjà
  const existingCode = await this.prisma.chargingStation.findUnique({
    where: { code: dto.code },
  });

  if (existingCode) {
    throw new ConflictException('Station code already exists');
  }

  // ✨ GÉNÉRER AUTOMATIQUEMENT LE QR CODE SI NON FOURNI
  let qrCode = dto.qrCode;
  if (!qrCode) {
    qrCode = this.qrCodeService.generateQrCodeData(dto.code, dto.stationId);
  }

  const station = await this.prisma.chargingStation.create({
    data: {
      ...dto,
      qrCode, // ← QR code généré automatiquement
    },
    include: {
      operator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return station;
}

  async update(id: string, dto: UpdateStationDto) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    // Vérifier le code si changé
    if (dto.code && dto.code !== station.code) {
      const existingCode = await this.prisma.chargingStation.findUnique({
        where: { code: dto.code },
      });

      if (existingCode) {
        throw new ConflictException('Station code already exists');
      }
    }

    const updatedStation = await this.prisma.chargingStation.update({
      where: { id },
      data: dto,
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedStation;
  }

  async remove(id: string) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    await this.prisma.chargingStation.delete({ where: { id } });

    return { message: 'Station deleted successfully' };
  }

  async getStats() {
    const [total, available, occupied, outOfService, maintenance] = await Promise.all([
      this.prisma.chargingStation.count(),
      this.prisma.chargingStation.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.chargingStation.count({ where: { status: 'OCCUPIED' } }),
      this.prisma.chargingStation.count({ where: { status: 'OUT_OF_SERVICE' } }),
      this.prisma.chargingStation.count({ where: { status: 'MAINTENANCE' } }),
    ]);

    return {
      total,
      available,
      occupied,
      outOfService,
      maintenance,
    };
  }

  // ==================== FAVORITES ====================

  async addToFavorites(userId: string, stationId: string) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id: stationId },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    const favorite = await this.prisma.favoriteStation.create({
      data: {
        userId,
        stationId,
      },
      include: {
        station: true,
      },
    });

    return favorite;
  }

  async removeFromFavorites(userId: string, stationId: string) {
    const favorite = await this.prisma.favoriteStation.findFirst({
      where: {
        userId,
        stationId,
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favoriteStation.delete({
      where: { id: favorite.id },
    });

    return { message: 'Removed from favorites' };
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favoriteStation.findMany({
      where: { userId },
      include: {
        station: {
          include: {
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => f.station);
  }

  // ==================== UTILITY ====================

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  async regenerateQrCode(stationId: string) {
  const station = await this.prisma.chargingStation.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    throw new NotFoundException('Station not found');
  }

  // Générer nouveau QR code
  const newQrCode = this.qrCodeService.generateQrCodeData(
    station.code,
    station.stationId,
  );

  // Mettre à jour
  const updated = await this.prisma.chargingStation.update({
    where: { id: stationId },
    data: {
      qrCode: newQrCode,
    },
  });

  return {
    station: updated,
    qrCode: newQrCode,
    message: 'QR code regenerated successfully',
  };
}
}