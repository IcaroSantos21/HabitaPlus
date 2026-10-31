import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 'A' })
  @IsString({ message: 'O bloco deve ser um texto.' })
  @IsNotEmpty({ message: 'O bloco é obrigatório.' })
  bloco!: string;

  @ApiProperty({ example: '101' })
  @IsString({ message: 'O número deve ser um texto.' })
  @IsNotEmpty({ message: 'O número é obrigatório.' })
  numero!: string;

  @ApiProperty({ example: 2 })
  @IsInt({ message: 'A quantidade de quartos deve ser um número inteiro.' })
  @Min(0, { message: 'A quantidade de quartos não pode ser negativa.' })
  quartos!: number;

  @ApiProperty({ example: 65.5 })
  @IsNumber({}, { message: 'A área deve ser um número.' })
  @Min(0, { message: 'A área não pode ser negativa.' })
  areaM2!: number;

  @ApiProperty({ example: 1800 })
  @IsNumber({}, { message: 'O valor sugerido deve ser um número.' })
  @Min(0, { message: 'O valor sugerido não pode ser negativo.' })
  valorAluguelSugerido!: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean({
    message: 'A disponibilidade para locação deve ser verdadeira ou falsa.',
  })
  disponivelLocacao = true;
}
