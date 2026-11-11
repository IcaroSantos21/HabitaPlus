import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const normalizeTextValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class NluParseDto {
  @ApiProperty({ example: 'Quais apartamentos estão disponíveis?' })
  @Transform(({ value }) => normalizeTextValue(value))
  @IsString({ message: 'O texto deve ser uma string.' })
  @IsNotEmpty({ message: 'O texto é obrigatório.' })
  @MaxLength(2000, { message: 'O texto deve ter no máximo 2000 caracteres.' })
  texto!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject({ message: 'O contexto deve ser um objeto.' })
  contexto?: Record<string, unknown>;
}
