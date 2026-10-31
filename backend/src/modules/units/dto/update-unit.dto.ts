import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString({ message: 'O bloco deve ser um texto.' })
  @IsNotEmpty({ message: 'O bloco não pode ser vazio.' })
  bloco?: string;

  @ApiPropertyOptional({ example: '101' })
  @IsOptional()
  @IsString({ message: 'O número deve ser um texto.' })
  @IsNotEmpty({ message: 'O número não pode ser vazio.' })
  numero?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt({ message: 'A quantidade de quartos deve ser um número inteiro.' })
  @Min(0, { message: 'A quantidade de quartos não pode ser negativa.' })
  quartos?: number;

  @ApiPropertyOptional({ example: 65.5 })
  @IsOptional()
  @IsNumber({}, { message: 'A área deve ser um número.' })
  @Min(0, { message: 'A área não pode ser negativa.' })
  areaM2?: number;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsNumber({}, { message: 'O valor sugerido deve ser um número.' })
  @Min(0, { message: 'O valor sugerido não pode ser negativo.' })
  valorAluguelSugerido?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({
    message: 'A disponibilidade para locação deve ser verdadeira ou falsa.',
  })
  disponivelLocacao?: boolean;
}
