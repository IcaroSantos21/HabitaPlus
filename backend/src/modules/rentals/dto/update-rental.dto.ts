import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateRentalDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: 'O identificador do locatário deve ser um número inteiro.',
  })
  @Min(1, { message: 'O locatário deve ser válido.' })
  locatarioId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O valor mensal deve ser um número inteiro.' })
  @Min(0, { message: 'O valor mensal não pode ser negativo.' })
  valorMensal?: number;

  @IsOptional()
  @IsDateString({}, { message: 'A data de início deve estar no formato ISO.' })
  inicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'A data final deve estar no formato ISO.' })
  fim?: string | null;
}
