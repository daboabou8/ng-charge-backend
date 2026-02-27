import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { ConnectorType, StationStatus } from '@prisma/client';

export class CreateStationDto {
  @IsString()
  stationId: string; // ID CitrineOS

  @IsString()
  name: string;

  @IsOptional() 
  @IsString()
  code?: string; // Code pour scan manuel

  @IsOptional()
  @IsString()
  qrCode?: string;


  // Location
  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  // Details
  @IsNumber()
  @Min(0)
  power: number; // kW

  @IsEnum(ConnectorType)
  connectorType: ConnectorType;

  @IsNumber()
  @Min(1)
  @IsOptional()
  numberOfPorts?: number;

  @IsEnum(StationStatus)
  @IsOptional()
  status?: StationStatus;

  // Pricing
  @IsNumber()
  @Min(0)
  pricePerKwh: number; // GNF/kWh

  // Operator
  @IsString()
  @IsOptional()
  operatorId?: string;

  // Photos
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  // Metadata
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];
}