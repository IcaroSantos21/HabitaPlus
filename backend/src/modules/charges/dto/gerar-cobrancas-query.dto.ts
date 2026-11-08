import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class GerarCobrancasQueryDto {
  @ApiProperty({ example: '2026-11', description: 'Competência (YYYY-MM)' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'A competência é obrigatória e deve estar no formato YYYY-MM.',
  })
  competencia!: string;
}
