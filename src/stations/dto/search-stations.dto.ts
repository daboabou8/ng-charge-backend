import { IsNumber, IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { ConnectorType, StationStatus } from '@prisma/client';

export class SearchStationsDto {
  // Pagination
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Location search (Req 1-2)
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  radius?: number; // km

  // Filters (Req 2)
  @IsEnum(StationStatus)
  @IsOptional()
  status?: StationStatus;

  @IsEnum(ConnectorType)
  @IsOptional()
  connectorType?: ConnectorType;

  @IsString()
  @IsOptional()
  city?: string;

  // Search by code (Req 5)
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  search?: string; // Recherche générale
}