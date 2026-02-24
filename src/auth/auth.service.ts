import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Vérifier si le téléphone existe déjà
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
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
        status: UserStatus.ACTIVE,
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

    // Générer les tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Supprimer le mot de passe de la réponse
    delete user.password;

    return {
      user,
      ...tokens,
    };
  }

async login(dto: LoginDto) {
  // Validation : soit email soit phone
  if (!dto.email && !dto.phone) {
    throw new UnauthorizedException('Email or phone number is required');
  }

  // Construire la condition WHERE dynamiquement
  const whereCondition: any = {};
  
  if (dto.email && dto.phone) {
    // Si les deux sont fournis, chercher par les deux
    whereCondition.OR = [
      { email: dto.email },
      { phone: dto.phone },
    ];
  } else if (dto.email) {
    // Seulement email
    whereCondition.email = dto.email;
  } else if (dto.phone) {
    // Seulement téléphone
    whereCondition.phone = dto.phone;
  }

  // Trouver l'utilisateur
  const user = await this.prisma.user.findFirst({
    where: whereCondition,
    include: { profile: true },
  });

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Vérifier le statut
  if (user.status === UserStatus.SUSPENDED) {
    throw new UnauthorizedException('Account suspended');
  }

  if (user.status === UserStatus.INACTIVE) {
    throw new UnauthorizedException('Account inactive');
  }

  // Vérifier le mot de passe
  const isPasswordValid = await bcrypt.compare(dto.password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Mettre à jour lastLogin
  await this.prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Générer les tokens
  const tokens = await this.generateTokens(user.id, user.email, user.role);

  // Supprimer le mot de passe
  delete user.password;

  return {
    user,
    ...tokens,
  };
}

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION || '7d',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return null;
    }

    delete user.password;
    return user;
  }
}