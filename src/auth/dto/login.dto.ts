import { IsString, IsOptional, ValidateIf } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.phone || o.email)
  email?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.email || o.phone)
  phone?: string;

  @IsString()
  password: string;
}