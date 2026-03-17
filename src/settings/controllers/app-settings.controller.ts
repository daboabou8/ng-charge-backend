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
} from '@nestjs/common';
import { AppSettingsService } from '../services/app-settings.service';
import { CreateSettingDto } from '../dto/create-setting.dto';
import { UpdateSettingDto } from '../dto/update-setting.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SettingCategory } from '@prisma/client';

@Controller('settings/app')
export class AppSettingsController {
  constructor(private appSettingsService: AppSettingsService) {}

  // ==================== PUBLIC ROUTES ====================

  @Get('public')
  async getPublicSettings() {
    return this.appSettingsService.findPublic();
  }

  // ==================== ADMIN ROUTES ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  async getAllSettings(@Query('category') category?: SettingCategory) {
    return this.appSettingsService.findAll(category);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':key')
  async getSetting(@Param('key') key: string) {
    return this.appSettingsService.findByKey(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createSetting(@Body() dto: CreateSettingDto) {
    return this.appSettingsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':key')
  async updateSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.appSettingsService.update(key, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put()
  async updateBulkSettings(@Body() updates: { key: string; value: string }[]) {
    return this.appSettingsService.updateBulk(updates);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':key')
  async deleteSetting(@Param('key') key: string) {
    return this.appSettingsService.remove(key);
  }
}