import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { CategoriaAnuncio } from '../../../database/entities/enums';

export class CreateAnuncioDto {
  @ApiProperty({ example: 'Mesa de escritório' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  titulo!: string;

  @ApiProperty({ example: 'Mesa usada em bom estado.' })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  descricao!: string;

  @ApiProperty({ example: 250, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  preco!: number;

  @ApiProperty({ enum: CategoriaAnuncio })
  @IsEnum(CategoriaAnuncio)
  categoria!: CategoriaAnuncio;

  @ApiPropertyOptional({
    example: 'https://exemplo.com/imagens/mesa.jpg',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imagemUrl?: string;
}