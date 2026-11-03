import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoTransacao } from '../../../database/entities/enums';
import { Transacao } from '../../../database/entities/transacao.entity';

export class TransacaoResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  usuarioId!: number;

  @ApiProperty({ enum: TipoTransacao })
  tipo!: TipoTransacao;

  @ApiProperty()
  categoria!: string;

  @ApiProperty({ example: 1250.5 })
  valor!: number;

  @ApiProperty({ example: '2026-10' })
  competencia!: string;

  @ApiProperty({ example: '2026-10-15' })
  data!: string;

  @ApiPropertyOptional()
  descricao!: string | null;

  static fromEntity(entity: Transacao): TransacaoResponseDto {
    return {
      id: entity.id,
      usuarioId: entity.usuario.id,
      tipo: entity.tipo,
      categoria: entity.categoria,
      valor: entity.valor,
      competencia: this.formatarData(entity.competencia).slice(0, 7),
      data: this.formatarData(entity.data),
      descricao: entity.descricao,
    };
  }

  private static formatarData(data: Date | string): string {
    if (data instanceof Date) {
      return data.toISOString().slice(0, 10);
    }

    return data.slice(0, 10);
  }
}

export class ResumoMensalResponseDto {
  @ApiProperty({ example: '2026-10' })
  month!: string;

  @ApiProperty({ example: 1000 })
  receitas!: number;

  @ApiProperty({ example: 6500 })
  despesas!: number;

  @ApiProperty({ example: 3500 })
  saldo!: number;
}
