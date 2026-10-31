import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TrimOrUndefined } from '../../../common/transformers/trim.transformer';
import { StatusChamado } from '../../../database/entities/enums';

export class FiltrosChamadoDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StatusChamado })
  @IsOptional()
  @TrimOrUndefined()
  @IsEnum(StatusChamado, {
    message: 'O status deve ser ABERTO, EM_ANDAMENTO ou ENCERRADO',
  })
  status?: StatusChamado;

  @ApiPropertyOptional({ example: 'eletrica' })
  @IsOptional()
  @TrimOrUndefined()
  @IsString({ message: 'A categoria deve ser um texto' })
  @MaxLength(60, { message: 'A categoria deve ter no máximo 60 caracteres.' })
  categoria?: string;

  @ApiPropertyOptional({ example: 'elevador' })
  @IsOptional()
  @TrimOrUndefined()
  @IsString({ message: 'O equipamento deve ser um texto ' })
  @MaxLength(60, { message: 'O equipamento deve ter no máximo 60 caracteres' })
  equipamento?: string;
}
