import { ApiProperty } from '@nestjs/swagger';

export class EquipamentoTotalDto {
  @ApiProperty({ example: 'elevador' })
  equipamento!: string;

  @ApiProperty({ example: 267 })
  total!: number;
}

export class EquipamentoMesTotalDto {
  @ApiProperty({ example: '2026-10', description: 'Competência YYYY-MM' })
  mes!: string;

  @ApiProperty({ example: 'elevador' })
  equipamento!: string;

  @ApiProperty({ example: 9 })
  total!: number;
}

export class EstatisticasChamadoResponseDto {
  @ApiProperty({ type: [EquipamentoTotalDto] })
  porEquipamento!: EquipamentoTotalDto[];

  @ApiProperty({ type: [EquipamentoMesTotalDto] })
  porEquipamentoEMes!: EquipamentoMesTotalDto[];
}
