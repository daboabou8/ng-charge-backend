import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SessionStatus } from '@prisma/client';

export class UpdateSessionDto {
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  meterStop?: number; // Wh

  @IsString()
  @IsOptional()
  stopReason?: string;

  @IsString()
  @IsOptional()
  failureReason?: string;
}