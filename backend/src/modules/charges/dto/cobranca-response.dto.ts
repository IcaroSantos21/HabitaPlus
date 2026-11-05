import { ApiProperty } from '@nestjs/swagger';
import { StatusCobranca } from '../../../database/entities/enums';
import { Cobranca } from '../../../database/entities/cobranca.entity';
import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';

export class ChargeUnitDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'A' })
  bloco!: string;

  @ApiProperty({ example: '101' })
  numero!: string;
}

export class ChargeResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ type: ChargeUnitDto })
  unidade!: ChargeUnitDto;

  @ApiProperty({ example: '2026-11' })
  competencia!: string;

  @ApiProperty({ example: 650 })
  valor!: number;

  @ApiProperty({ example: '2026-11-10' })
  vencimento!: string;

  @ApiProperty({ enum: StatusCobranca })
  status!: StatusCobranca;

  // stripeSessionId fica de fora: é detalhe interno da integração de pagamento.
  static fromEntity(entity: Cobranca): ChargeResponseDto {
    return {
      id: entity.id,
      unidade: {
        id: entity.unidade.id,
        bloco: entity.unidade.bloco,
        numero: entity.unidade.numero,
      },
      competencia: ChargeResponseDto.formatarData(entity.competencia).slice(
        0,
        7,
      ),
      valor: entity.valor,
      vencimento: ChargeResponseDto.formatarData(entity.vencimento),
      status: entity.status,
    };
  }

  private static formatarData(data: Date | string): string {
    return data instanceof Date
      ? data.toISOString().slice(0, 10)
      : data.slice(0, 10);
  }
}

export class PaginatedChargesResponseDto {
  @ApiProperty({ type: [ChargeResponseDto] })
  data!: ChargeResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class GenerateChargesResponseDto {
  @ApiProperty({ example: '2026-11' })
  competencia!: string;

  @ApiProperty({ example: '2026-11-10' })
  vencimento!: string;

  @ApiProperty({ example: 650 })
  valor!: number;

  @ApiProperty({
    example: 120,
    description: 'Unidades ocupadas na competência',
  })
  totalUnidadesOcupadas!: number;

  @ApiProperty({
    example: 118,
    description: 'Cobranças criadas nesta execução',
  })
  criadas!: number;

  @ApiProperty({ example: 2, description: 'Unidades que já tinham cobrança' })
  jaExistentes!: number;
}
