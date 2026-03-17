import {
  Controller,
  Get,
  Delete,
  Query,
  UseGuards,
  Header,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SystemLogsService } from '../services/system-logs.service';
import { GetLogsDto } from '../dto/get-logs.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('settings/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SystemLogsController {
  constructor(private logsService: SystemLogsService) {}

  @Get()
  async getAllLogs(@Query() dto: GetLogsDto) {
    return this.logsService.findAll(dto);
  }

  @Get('stats')
  async getLogStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.logsService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="system-logs.csv"')
  async exportLogs(@Query() dto: GetLogsDto, @Res() res: Response) {
    const csv = await this.logsService.exportLogs(dto);
    res.send(csv);
  }

  @Delete('cleanup')
  async cleanupOldLogs(@Query('days') days?: string) {
    const daysToKeep = days ? parseInt(days) : 90;
    return this.logsService.deleteOldLogs(daysToKeep);
  }
}