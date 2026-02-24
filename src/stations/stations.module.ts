import { Module } from '@nestjs/common';
import { StationsController } from './stations.controller';
import { MapController } from './map.controller';
import { StationsService } from './stations.service';
import { QrCodeService } from './qrcode.service'; 
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StationsController, MapController],
  providers: [StationsService, QrCodeService], 
  exports: [StationsService],
})
export class StationsModule {}