import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  stationId: string;

  @IsNumber()
  @Min(1)
  connectorId: number;

  @IsString()
  @IsOptional()
  offerId?: string; 

  @IsNumber()
  @IsOptional()
  @Min(0)
  meterStart?: number;
}