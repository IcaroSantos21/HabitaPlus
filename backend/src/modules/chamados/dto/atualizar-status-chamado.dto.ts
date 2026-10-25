import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StatusChamado } from '../../../database/entities/enums';

export class AtualizarStatusChamadoDto {
  @ApiProperty({ enum: StatusChamado, example: StatusChamado.EM_ANDAMENTO })
  @IsEnum(StatusChamado, {
    message: 'O status deve ser ABERTO, EM_ANDAMENTO, ou ENCERRADO',
  })
  status!: StatusChamado;
}
