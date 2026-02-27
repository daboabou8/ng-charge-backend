import { IsString, IsOptional } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}