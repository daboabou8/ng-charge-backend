import { IsString, IsNumber, Min } from 'class-validator';

export class RechargePinDto {
  @IsString()
  pin: string;

  @IsNumber()
  @Min(1000, { message: 'Le montant minimum est de 1000 GNF' })
  amount: number;
}