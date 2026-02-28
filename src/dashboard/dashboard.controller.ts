import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('revenue-chart')
  async getRevenueChart() {
    return this.dashboardService.getRevenueChart();
  }

  @Get('sessions-chart')
  async getSessionsChart() {
    return this.dashboardService.getSessionsChart();
  }

  @Get('recent-activities')
  async getRecentActivities() {
    return this.dashboardService.getRecentActivities();
  }

  @Get('stations-map')
  async getStationsMap() {
    return this.dashboardService.getStationsMap();
  }
}