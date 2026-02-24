import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CitrineosService } from './citrineos.service';
import { RemoteStartDto } from './dto/remote-start.dto';
import { RemoteStopDto } from './dto/remote-stop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('citrineos')
@UseGuards(JwtAuthGuard)
export class CitrineosController {
  constructor(private citrineos: CitrineosService) {}

  @Get('stations')
  async getAllStations() {
    return this.citrineos.getAllStations();
  }

  @Get('stations/:stationId')
  async getStationStatus(@Param('stationId') stationId: string) {
    return this.citrineos.getStationStatus(stationId);
  }

  @Post('stations/:stationId/remote-start')
  async remoteStart(@Param('stationId') stationId: string, @Body() dto: RemoteStartDto) {
    return this.citrineos.remoteStartTransaction(stationId, dto.connectorId, dto.idTag);
  }

  @Post('stations/:stationId/remote-stop')
  async remoteStop(@Param('stationId') stationId: string, @Body() dto: RemoteStopDto) {
    return this.citrineos.remoteStopTransaction(stationId, dto.transactionId);
  }

  @Post('sync')
  async syncStations() {
    return this.citrineos.syncStations();
  }

  @Get('transactions/:transactionId')
  async getTransaction(@Param('transactionId') transactionId: string) {
    return this.citrineos.getTransaction(Number(transactionId));
  }
}