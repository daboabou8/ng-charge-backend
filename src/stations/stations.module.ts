import { Module } from '@nestjs/common';
import { StationsController } from './stations.controller';
import { MapController } from './map.controller';
import { StationsService } from './stations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QrCodeModule } from '../qrcode/qrcode.module'; 

@Module({
  imports: [PrismaModule, QrCodeModule], 
  controllers: [StationsController, MapController],
  providers: [StationsService], 
  exports: [StationsService],
})
export class StationsModule {}