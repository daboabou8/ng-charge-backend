import { IsNumber, IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorType, StationStatus } from '@prisma/client';

export class SearchStationsDto {
  // Pagination
  @IsOptional()
  @Type(() => Number)  // ⬅️ AJOUTER
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)  // ⬅️ AJOUTER
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Location search
  @IsOptional()
  @Type(() => Number)  // ⬅️ AJOUTER
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)  // ⬅️ AJOUTER
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)  // ⬅️ AJOUTER
  @IsNumber()
  @Min(0)
  radius?: number; // km

  // Filters
  @IsEnum(StationStatus)
  @IsOptional()
  status?: StationStatus;

  @IsEnum(ConnectorType)
  @IsOptional()
  connectorType?: ConnectorType;

  @IsString()
  @IsOptional()
  city?: string;

  // Search by code
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  search?: string; // Recherche générale
}