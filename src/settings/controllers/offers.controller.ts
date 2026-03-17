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
  Patch,
} from '@nestjs/common';
import { OffersService } from '../services/offers.service';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { UpdateOfferDto } from '../dto/update-offer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('settings/offers')
export class OffersController {
  constructor(private offersService: OffersService) {}

  // ==================== PUBLIC ROUTES ====================

  @Get('public')
  async getPublicOffers() {
    return this.offersService.findPublic();
  }

  @Get('zone/:city')
  async getOffersByZone(@Param('city') city: string) {
    return this.offersService.findByZone(city);
  }

  // ==================== ADMIN ROUTES ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  async getAllOffers(@Query('includeInactive') includeInactive?: string) {
    return this.offersService.findAll(includeInactive === 'true');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  async getOffer(@Param('id') id: string) {
    return this.offersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createOffer(@Body() dto: CreateOfferDto) {
    return this.offersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  async updateOffer(@Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.offersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/toggle')
  async toggleOffer(@Param('id') id: string) {
    return this.offersService.toggleActive(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async deleteOffer(@Param('id') id: string) {
    return this.offersService.remove(id);
  }
}