import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './services/payments.service';
import { WalletService } from './services/wallet.service';
import { CinetpayService } from './services/cinetpay.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, WalletService, CinetpayService],
  exports: [PaymentsService, WalletService],
})
export class PaymentsModule {}