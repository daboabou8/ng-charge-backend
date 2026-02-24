import { IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RechargeWalletDto {
  @IsNumber()
  @Min(1000) // Minimum 1000 GNF
  amount: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod; // MOBILE_MONEY, CARD
}