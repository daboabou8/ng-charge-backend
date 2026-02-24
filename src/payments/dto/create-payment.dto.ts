import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsString()
  @IsOptional()
  description?: string;
}