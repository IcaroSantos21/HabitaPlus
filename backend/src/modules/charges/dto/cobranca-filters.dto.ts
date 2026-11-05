import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { StatusCobranca } from '../../../database/entities/enums';

export class ChargeFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-11' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'A competência deve estar no formato YYYY-MM.',
  })
  competencia?: string;

  @ApiPropertyOptional({ enum: StatusCobranca })
  @IsOptional()
  @IsEnum(StatusCobranca, {
    message: 'O status deve ser PENDENTE, PAGA ou ATRASADA.',
  })
  status?: StatusCobranca;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O id da unidade deve ser um número inteiro.' })
  @Min(1, { message: 'O id da unidade deve ser maior que zero.' })
  unidadeId?: number;
}
