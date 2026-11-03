import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TipoTransacao } from '../../../database/entities/enums';

export class TransacaoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'A competência deve estar no formato YYYY-MM.',
  })
  competencia?: string;

  @ApiPropertyOptional({ enum: TipoTransacao })
  @IsOptional()
  @IsEnum(TipoTransacao, { message: 'O tipo deve ser RECEITA ou DESPESA.' })
  tipo?: TipoTransacao;

  @ApiPropertyOptional({ example: 'energia' })
  @IsOptional()
  @IsString({ message: 'A categoria deve ser um texto.' })
  @MaxLength(100, { message: 'A categoria deve ter no máximo 100 caracteres.' })
  categoria?: string;
}

export class ResumoMensalQueryDto {
  @ApiPropertyOptional({ example: '2025-01', default: '2025-01' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'O parâmetro from deve estar no formato YYYY-MM.',
  })
  from = '2025-01';

  @ApiPropertyOptional({ example: '2026-10', default: '2026-10' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'O parâmetro to deve estar no formato YYYY-MM.',
  })
  to = '2026-10';
}
