import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './services/payments.service';
import { RechargeWalletDto } from './dto/recharge-wallet.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { CinetpayWebhookDto } from './dto/cinetpay-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // ==================== WALLET ROUTES (Authenticated) ====================

  @UseGuards(JwtAuthGuard)
  @Get('wallet/my')
  async getMyWallet(@Request() req) {
    return this.paymentsService.getMyWallet(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('wallet/transactions')
  async getMyTransactions(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.paymentsService.getMyTransactions(req.user.id, Number(page), Number(limit));
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallet/recharge')
  async rechargeWallet(@Request() req, @Body() dto: RechargeWalletDto) {
    return this.paymentsService.rechargeWallet(req.user.id, dto);
  }

  // ==================== SESSION PAYMENT (Authenticated) ====================

  @UseGuards(JwtAuthGuard)
  @Post('session/:sessionId/pay')
  async payForSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.paymentsService.payForSession(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyPayments(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.paymentsService.getMyPayments(req.user.id, Number(page), Number(limit));
  }

  // ==================== CINETPAY WEBHOOK (Public) ====================

  @Post('webhook/cinetpay')
  async cinetpayWebhook(@Body() data: CinetpayWebhookDto) {
    return this.paymentsService.handleCinetpayWebhook(data);
  }

  // ==================== ADMIN ROUTES ====================
  // ⬇️ ROUTES ADMIN EN PREMIER (PLUS SPÉCIFIQUES)

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Get('admin/stats')
  async getStats() {
    return this.paymentsService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Get('admin/all')
  async findAll(@Query() dto: PaymentFiltersDto) {
    // Convertir les query params
    if (dto.page) dto.page = Number(dto.page);
    if (dto.limit) dto.limit = Number(dto.limit);

    return this.paymentsService.findAll(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Get('admin/export')
  async exportPayments(@Query() dto: PaymentFiltersDto) {
    return this.paymentsService.exportPayments(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  @Post('admin/:id/refund')
  async refundPayment(
    @Param('id') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(paymentId, dto.reason);
  }

  // ⬇️ ROUTE GÉNÉRIQUE `:id` EN DERNIER (MOINS SPÉCIFIQUE)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}