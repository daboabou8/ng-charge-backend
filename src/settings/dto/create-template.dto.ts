import { IsString, IsEnum, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { NotificationType, NotificationChannel } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body: string;

  @IsArray()
  @IsString({ each: true })
  variables: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  language?: string;
}