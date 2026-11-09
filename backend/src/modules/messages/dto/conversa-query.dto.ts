import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ConversaQueryDto {
  @ApiPropertyOptional({
    example: 7,
    description:
      'Obrigatório para o vendedor: id do comprador com quem ele conversa. O comprador não precisa informar.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O usuarioId deve ser um número inteiro.' })
  @Min(1, { message: 'O usuarioId deve ser maior ou igual a 1.' })
  usuarioId?: number;
}
