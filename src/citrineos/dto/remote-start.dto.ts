import { IsString, IsNumber, IsOptional } from 'class-validator';

export class RemoteStartDto {
  @IsString()
  stationId: string; 

  @IsNumber()
  connectorId: number;

  @IsString()
  @IsOptional()
  idTag?: string;
}