import { ApiProperty } from '@nestjs/swagger';

export class InadimplenciaUnidadeDto {
  @ApiProperty({ example: 5 })
  unidadeId!: number;

  @ApiProperty({ example: 'B' })
  bloco!: string;

  @ApiProperty({ example: '302' })
  numero!: string;

  @ApiProperty({ example: 1300 })
  totalEmAtraso!: number;

  @ApiProperty({ example: 2 })
  cobrancasAtrasadas!: number;
}

export class InadimplenciaMesDto {
  @ApiProperty({ example: '2026-10' })
  competencia!: string;

  @ApiProperty({ example: 3250 })
  totalCobrado!: number;

  @ApiProperty({ example: 1300 })
  totalEmAtraso!: number;

  @ApiProperty({ example: 40 })
  percentual!: number;
}

export class InadimplenciaResponseDto {
  @ApiProperty({ example: 1300 })
  totalEmAtraso!: number;

  @ApiProperty({
    example: 20,
    description: 'Em atraso / total cobrado, de 0 a 100',
  })
  percentual!: number;

  @ApiProperty({ type: [InadimplenciaUnidadeDto] })
  porUnidade!: InadimplenciaUnidadeDto[];

  @ApiProperty({ type: [InadimplenciaMesDto] })
  porMes!: InadimplenciaMesDto[];
}

export class DashboardResponseDto {
  @ApiProperty({ example: 8000 })
  receitaMes!: number;

  @ApiProperty({ example: 5000 })
  despesaMes!: number;

  @ApiProperty({ example: 3000 })
  saldoMes!: number;

  @ApiProperty({ example: 10 })
  inadimplenciaPercentual!: number;

  @ApiProperty({ example: 4 })
  cobrancasPendentes!: number;
}
