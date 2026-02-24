import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Patch, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  UseInterceptors, 
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  // ==================== ADMIN ROUTES ====================

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.usersService.findAll(Number(page), Number(limit));
  }

  @Get('stats')
  async getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // ==================== STATUS UPDATE ====================

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' },
  ) {
    return this.usersService.updateUserStatus(id, updateStatusDto.status);
  }

  // ==================== AVATAR UPLOAD ====================

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Seules les images sont acceptées!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;

    await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
    });

    return { avatarUrl };
  }

  // ==================== USER PROFILE ROUTES ====================

  @Get('me/profile')
  async getMyProfile(@Request() req) {
    return this.usersService.getMyProfile(req.user.id);
  }

  @Put('me/profile')
  async updateMyProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMyProfile(req.user.id, dto);
  }
}