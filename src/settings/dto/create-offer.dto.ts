import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, Min } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKwh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPower?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPower?: number;

  @IsArray()
  @IsString({ each: true })
  zones: string[];

  @IsOptional()
  @IsString()
  startTime?: string; // "HH:mm"

  @IsOptional()
  @IsString()
  endTime?: string; // "HH:mm"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activeDays?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isPromo?: boolean;

  @IsOptional()
  @IsNumber()
  promoPrice?: number;

  @IsOptional()
  promoStart?: Date;

  @IsOptional()
  promoEnd?: Date;
}