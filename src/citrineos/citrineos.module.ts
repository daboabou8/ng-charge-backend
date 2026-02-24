import { Module } from '@nestjs/common';
import { CitrineosController } from './citrineos.controller';
import { CitrineosService } from './citrineos.service';

@Module({
  controllers: [CitrineosController],
  providers: [CitrineosService],
  exports: [CitrineosService],
})
export class CitrineosModule {}