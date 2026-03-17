import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { SettingType, SettingCategory } from '@prisma/client';

export class CreateSettingDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsEnum(SettingType)
  type: SettingType;

  @IsEnum(SettingCategory)
  category: SettingCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;
}