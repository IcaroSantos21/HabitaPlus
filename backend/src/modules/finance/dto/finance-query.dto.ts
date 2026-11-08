import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

const FORMATO_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

export class InadimplenciaQueryDto {
  @ApiPropertyOptional({
    example: '2026-01',
    description: 'Primeira competência',
  })
  @IsOptional()
  @Matches(FORMATO_COMPETENCIA, {
    message: 'O parâmetro from deve estar no formato YYYY-MM.',
  })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11',
    description: 'Última competência',
  })
  @IsOptional()
  @Matches(FORMATO_COMPETENCIA, {
    message: 'O parâmetro to deve estar no formato YYYY-MM.',
  })
  to?: string;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ example: '2026-11', description: 'Padrão: mês atual' })
  @IsOptional()
  @Matches(FORMATO_COMPETENCIA, {
    message: 'A competência deve estar no formato YYYY-MM.',
  })
  competencia?: string;
}
