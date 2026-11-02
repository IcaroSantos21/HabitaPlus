import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';
import { TipoTransacao } from '../../../database/entities/enums';

export class CriarTransacaoDto {
  @ApiProperty({ enum: TipoTransacao })
  @IsEnum(TipoTransacao, { message: 'O tipo deve ser RECEITA ou DESPESA.' })
  tipo!: TipoTransacao;

  @ApiProperty({ example: 'energia' })
  @IsString({ message: 'A categoria deve ser um texto.' })
  @MaxLength(100, { message: 'A categoria deve ter no máximo 100 caracteres.' })
  categoria!: string;

  @ApiProperty({ example: 1250.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'O valor deve ser um número com no máximo duas casas decimais.',
    },
  )
  @Min(0.01, { message: 'O valor deve ser maior que zero.' })
  valor!: number;

  @ApiProperty({ example: '2026-10' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'A competência deve estar no formato YYYY-MM.',
  })
  competencia!: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString({}, { message: 'A data deve ser uma data ISO 8061 válida.' })
  data!: string;

  @ApiPropertyOptional({ example: 'Conta de energia das áreas comuns.' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres.' })
  descricao?: string;
}
