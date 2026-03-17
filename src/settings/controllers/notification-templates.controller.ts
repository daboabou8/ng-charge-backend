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
import { NotificationTemplatesService } from '../services/notification-templates.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { NotificationType, NotificationChannel } from '@prisma/client';

@Controller('settings/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class NotificationTemplatesController {
  constructor(private templatesService: NotificationTemplatesService) {}

  @Get()
  async getAllTemplates(
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel
  ) {
    return this.templatesService.findAll(type, channel);
  }

  @Get('active')
  async getActiveTemplates() {
    return this.templatesService.findActive();
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Put(':id')
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Patch(':id/toggle')
  async toggleTemplate(@Param('id') id: string) {
    return this.templatesService.toggleActive(id);
  }

  @Post(':id/test')
  async testTemplate(@Param('id') id: string, @Body() sampleData: Record<string, any>) {
    return this.templatesService.testTemplate(id, sampleData);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}