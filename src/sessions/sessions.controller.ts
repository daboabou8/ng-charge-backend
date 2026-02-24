import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  // ==================== USER ROUTES ====================

  @Get('my/active')
  async getMyActiveSessions(@Request() req) {
    return this.sessionsService.findMyActiveSessions(req.user.id);
  }

  @Get('my/history')
  async getMyHistory(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.sessionsService.findMyHistory(req.user.id, Number(page), Number(limit));
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(req.user.id, dto);
  }

  @Post(':id/start')
  async startSession(@Request() req, @Param('id') sessionId: string) {
    return this.sessionsService.startSession(sessionId, req.user.id);
  }

  @Post(':id/stop')
  async stopSession(
    @Request() req,
    @Param('id') sessionId: string,
    @Body() dto?: UpdateSessionDto,
  ) {
    return this.sessionsService.stopSession(sessionId, req.user.id, dto);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.sessionsService.findOne(id, req.user.id);
  }

  // ==================== ADMIN ROUTES ====================

  @Get('admin/stats')
  async getStats() {
    return this.sessionsService.getStats();
  }

  @Get('admin/all')
  async findAll(@Query() dto: SessionFiltersDto) {
    // Convertir les query params
    if (dto.page) dto.page = Number(dto.page);
    if (dto.limit) dto.limit = Number(dto.limit);

    return this.sessionsService.findAll(dto);
  }

  @Post('admin/:id/stop')
  async adminStopSession(@Param('id') sessionId: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.adminStopSession(sessionId, dto);
  }
}