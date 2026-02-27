import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { StationsService } from './stations.service';
import { PrismaService } from '../prisma/prisma.service';
import { QrCodeService } from '../qrcode/qrcode.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { SearchStationsDto } from './dto/search-stations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('stations')
export class StationsController {
  constructor(
    private stationsService: StationsService,
    private prisma: PrismaService,
    private qrCodeService: QrCodeService,
  ) {}

  // ==================== ROUTES SPÉCIFIQUES D'ABORD ====================

  @Get('stats')
  async getStats() {
    return this.stationsService.getStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites/my')
  async getMyFavorites(@Request() req) {
    return this.stationsService.getFavorites(req.user.id);
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.stationsService.findByCode(code);
  }

  @Get('qr/:qrCode')
  async findByQrCode(@Param('qrCode') qrCode: string) {
    return this.stationsService.findByQrCode(qrCode);
  }

  @Get('scan/qr/:qrCode')
  async scanQrCode(@Param('qrCode') qrCode: string) {
    const station = await this.stationsService.findByQrCode(qrCode);

    const offers = await this.prisma.chargingOffer.findMany({
      where: {
        isActive: true,
        zones: {
          has: station.city,
        },
      },
      orderBy: { price: 'asc' },
    });

    return {
      station,
      offers,
      message: 'Sélectionnez votre offre de recharge',
      quickActions: {
        stationId: station.id,
        connectorId: 1,
        availablePorts: station.numberOfPorts,
      },
    };
  }

  // ==================== QR CODE ROUTES ====================

  @Get(':id/qrcode/preview')
  async getQrCodePreview(@Param('id') id: string) {
    const station = await this.stationsService.findOne(id);
    
    if (!station.qrCode) {
      throw new NotFoundException('QR Code not found');
    }

    const qrCodeDataUrl = await this.qrCodeService.getQrCodeAsBase64(
      station.code,
      station.stationId,
    );

    return {
      qrCodeDataUrl,
      stationId: station.id,
      stationCode: station.code,
      stationName: station.name,
    };
  }

  @Get(':id/qrcode/image')
  async downloadQrCode(@Param('id') id: string, @Res() res: Response) {
    const station = await this.stationsService.findOne(id);
    
    if (!station.qrCode) {
      throw new NotFoundException('QR Code not found');
    }

    const filepath = this.qrCodeService.getQrCodePath(station.code);
    
    res.download(filepath, `qrcode-${station.code}.png`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Post(':id/qrcode/regenerate')
  async regenerateQrCode(@Param('id') id: string) {
    const result = await this.stationsService.regenerateQrCode(id);
    
    const qrCodeDataUrl = await this.qrCodeService.getQrCodeAsBase64(result.station.code, result.station.stationId);

    return {
      message: result.message,
      qrCodeDataUrl,
      station: result.station,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Get('qrcodes/batch')
  async getBatchQrCodes(@Query('ids') ids: string) {
    const stationIds = ids.split(',');

    const stations = await this.prisma.chargingStation.findMany({
      where: {
        id: {
          in: stationIds,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        qrCode: true,
        address: true,
        stationId: true,
      },
    });

    const qrCodes = await Promise.all(
      stations.map(async (station) => {
        const qrCodeDataUrl = await this.qrCodeService.getQrCodeAsBase64(station.code, station.stationId);
        return {
          ...station,
          qrCodeDataUrl,
        };
      }),
    );

    return {
      count: qrCodes.length,
      stations: qrCodes,
    };
  }

  // ==================== ROUTES GÉNÉRIQUES ====================

  @Get()
  async findAll(@Query() dto: SearchStationsDto) {
    if (dto.page) dto.page = Number(dto.page);
    if (dto.limit) dto.limit = Number(dto.limit);
    if (dto.latitude) dto.latitude = Number(dto.latitude);
    if (dto.longitude) dto.longitude = Number(dto.longitude);
    if (dto.radius) dto.radius = Number(dto.radius);

    return this.stationsService.findAll(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.stationsService.findOne(id);
  }

  // ==================== FAVORITES ====================

  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  async addToFavorites(@Request() req, @Param('id') stationId: string) {
    return this.stationsService.addToFavorites(req.user.id, stationId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/favorite')
  async removeFromFavorites(@Request() req, @Param('id') stationId: string) {
    return this.stationsService.removeFromFavorites(req.user.id, stationId);
  }

  // ==================== ADMIN/OPERATOR ROUTES ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Post()
  async create(@Body() dto: CreateStationDto) {
    return this.stationsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStationDto) {
    return this.stationsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.stationsService.remove(id);
  }
}