import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoTransacao } from '../../../database/entities/enums';

export class AtualizarTransacaoDto {
  @ApiPropertyOptional({ enum: TipoTransacao })
  @IsOptional()
  @IsEnum(TipoTransacao, { message: 'O tipo deve ser RECEITA ou DESPESA.' })
  tipo?: TipoTransacao;

  @ApiPropertyOptional({ example: 'energia' })
  @IsOptional()
  @IsString({ message: 'A categoria deve ser um texto.' })
  @MaxLength(100, { message: 'A categoria deve ter no máximo 100 caracteres.' })
  categoria?: string;

  @ApiPropertyOptional({ example: 1250.5, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser um número ' })
  @Min(0.01, { message: 'O valor deve ser maior que zero.' })
  valor?: number;

  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])/, {
    message: 'A competência deve estar no formato YYYY-MM.',
  })
  competencia?: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsOptional()
  @IsDateString({}, { message: 'A data deve ser uma data ISO 8601 válida.' })
  data?: string;

  @ApiPropertyOptional({ example: 'Conta revisada' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres ' })
  descricao?: string;
}
