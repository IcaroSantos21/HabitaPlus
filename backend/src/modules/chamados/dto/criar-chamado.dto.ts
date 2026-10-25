import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../../common/transformers/trim.transformer';

export class CriarChamadoDto {
  @ApiPropertyOptional({
    example: 12,
    description: 'Unidade do chamado. Informado a unidade OU área comum.',
  })
  @IsOptional()
  @IsInt({ message: 'A unidade deve ser um número inteiro' })
  @IsPositive({ message: 'A unidade deve ser um número positivo' })
  unidadeId?: number;

  @ApiPropertyOptional({
    example: 'Salão de Festas',
    description: 'Área comum do chamado. Informe a unidade OU a área comum.',
  })
  @IsOptional()
  @Trim()
  @IsString({ message: 'A área comum deve ser um texto. ' })
  @IsNotEmpty({ message: 'A área comum não pode ser vazia' })
  @MaxLength(100, {
    message: 'A área comum deve ter no máximo 100 caracteres.',
  })
  areaComum?: string;

  @ApiProperty({ example: 'Eletrica' })
  @Trim()
  @IsString({ message: 'A categoria deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe a categoria do chamado ' })
  @MaxLength(60, { message: 'A categoria deve ter no máximo 60 caracteres' })
  categoria!: string;

  @ApiProperty({ example: 'Elevador' })
  @Trim()
  @IsString({ message: 'O equipamento deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe o equipamento chamado' })
  @MaxLength(60, { message: 'O equipamento deve ter no máximo 60 caracteres' })
  equipamento!: string;

  @ApiProperty({ example: 'O elevador social está parando entre os andares' })
  @Trim()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe a descrição do chamado' })
  @MaxLength(2000, {
    message: 'A descrição deve ter no máximo 200 caracteres',
  })
  descricao!: string;
}
