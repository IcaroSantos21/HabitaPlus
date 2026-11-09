import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateComunicadoDto {
  @ApiProperty({ example: 'Manutenção da piscina' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  titulo!: string;

  @ApiProperty({
    example: 'A piscina ficará fechada para manutenção nesta sexta-feira.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  conteudo!: string;
}
