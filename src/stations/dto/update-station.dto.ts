import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { ConnectorType, StationStatus } from '@prisma/client';

export class UpdateStationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  qrCode?: string;

  // Location
  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  // Details
  @IsNumber()
  @Min(0)
  @IsOptional()
  power?: number;

  @IsEnum(ConnectorType)
  @IsOptional()
  connectorType?: ConnectorType;

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
  @IsOptional()
  pricePerKwh?: number;

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