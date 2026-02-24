import { IsNumber } from 'class-validator';

export class RemoteStopDto {
  @IsNumber()
  transactionId: number;
}