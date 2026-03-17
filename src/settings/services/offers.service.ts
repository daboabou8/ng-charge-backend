import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { UpdateOfferDto } from '../dto/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  // Liste toutes les offres
  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    const offers = await this.prisma.chargingOffer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return offers;
  }

  // Offres publiques (pour utilisateurs)
  async findPublic() {
    return this.prisma.chargingOffer.findMany({
      where: {
        isActive: true,
        isPublic: true,
      },
      orderBy: { price: 'asc' },
    });
  }

  // Offres par zone
  async findByZone(city: string) {
    return this.prisma.chargingOffer.findMany({
      where: {
        isActive: true,
        isPublic: true,
        OR: [
          { zones: { has: city } },
          { zones: { has: 'All' } },
        ],
      },
      orderBy: { price: 'asc' },
    });
  }

  // Détails d'une offre
  async findOne(id: string) {
    const offer = await this.prisma.chargingOffer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre introuvable');
    }

    return offer;
  }

  // Créer une offre
  async create(data: CreateOfferDto) {
    return this.prisma.chargingOffer.create({
      data,
    });
  }

  // Modifier une offre
  async update(id: string, data: UpdateOfferDto) {
    const offer = await this.prisma.chargingOffer.findUnique({
      where: { id },
    });

    if (!offer) {
      throw new NotFoundException('Offre introuvable');
    }

    return this.prisma.chargingOffer.update({
      where: { id },
      data,
    });
  }

  // Activer/Désactiver une offre
  async toggleActive(id: string) {
    const offer = await this.findOne(id);

    return this.prisma.chargingOffer.update({
      where: { id },
      data: { isActive: !offer.isActive },
    });
  }

  // Supprimer une offre
  async remove(id: string) {
    const offer = await this.prisma.chargingOffer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre introuvable');
    }

    if (offer._count.sessions > 0) {
      throw new ConflictException(
        'Impossible de supprimer une offre utilisée dans des sessions'
      );
    }

    await this.prisma.chargingOffer.delete({ where: { id } });

    return { message: 'Offre supprimée avec succès' };
  }
}