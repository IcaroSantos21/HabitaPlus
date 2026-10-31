import { IsDateString, IsOptional } from 'class-validator';

export class EndRentalDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'A data de encerramento deve estar no formato ISO.' },
  )
  fim?: string;
}
