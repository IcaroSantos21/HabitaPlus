import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class EnviarMensagemDto {
  @ApiProperty({ example: 'Olá! O sofá ainda está disponível?' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O texto da mensagem deve ser um texto.' })
  @IsNotEmpty({ message: 'O texto da mensagem é obrigatório.' })
  @MaxLength(2000, {
    message: 'O texto da mensagem deve ter no máximo 2000 caracteres.',
  })
  texto!: string;

  @ApiPropertyOptional({
    example: 7,
    description:
      'Obrigatório quando o vendedor responde: id do comprador. O comprador não precisa informar (o destinatário é sempre o vendedor).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O destinatarioId deve ser um número inteiro.' })
  @Min(1, { message: 'O destinatarioId deve ser maior ou igual a 1.' })
  destinatarioId?: number;
}
