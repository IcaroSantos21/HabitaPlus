import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TrimOrUndefined } from '../../../common/transformers/trim.transformer';

export class HistoricoChamadoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'elevador' })
  @IsOptional()
  @TrimOrUndefined()
  @IsString({ message: 'O equipamento deve ser um texto.' })
  @MaxLength(60, { message: 'O equipamento deve ter no máximo 60 caracteres' })
  equipamento?: string;

  @ApiPropertyOptional({ example: 'salao_de_festas' })
  @IsOptional()
  @TrimOrUndefined()
  @IsString({ message: 'A área deve ser um texto' })
  @MaxLength(100, { message: 'A área deve ter no máximo 100 caracteres' })
  area?: string;
}
