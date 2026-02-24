import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ==================== ADMIN ROUTES ====================

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          profile: true,
          _count: {
            select: {
              sessions: true,
              payments: true,
              vehicles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    // Supprimer les mots de passe
    users.forEach((user) => delete user.password);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        vehicles: true,
        rfidCards: true,
        sessions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            sessions: true,
            payments: true,
            vehicles: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    delete user.password;
    return user;
  }

  async create(dto: CreateUserDto) {
    // Vérifier email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Vérifier téléphone
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existingPhone) {
        throw new ConflictException('Phone already exists');
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || 'USER',
        status: dto.status || 'ACTIVE',
        profile: {
          create: {
            country: 'Guinea',
            language: 'fr',
          },
        },
      },
      include: {
        profile: true,
      },
    });

    delete user.password;
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Vérifier email si changé
    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Vérifier téléphone si changé
    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existingPhone) {
        throw new ConflictException('Phone already exists');
      }
    }

    // Mettre à jour
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: { profile: true },
    });

    delete updatedUser.password;
    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  // ==================== USER PROFILE ROUTES ====================

  async getMyProfile(userId: string) {
    return this.findOne(userId);
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mettre à jour le profil
    const updatedProfile = await this.prisma.userProfile.update({
      where: { userId },
      data: dto,
    });

    return updatedProfile;
  }

  async getStats() {
    const [totalUsers, activeUsers, suspendedUsers, adminCount, operatorCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.user.count({ where: { role: 'OPERATOR' } }),
      ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      adminCount,
      operatorCount,
      userCount: totalUsers - adminCount - operatorCount,
    };
  }


async updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
  // Vérifier que l'utilisateur existe
  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException(`Utilisateur avec l'ID ${id} introuvable`);
  }

  // Mettre à jour le statut
  return this.prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
}