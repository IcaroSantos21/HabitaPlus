import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { Notificacao } from '../../../database/entities/notificacao.entity';

export class NotificacaoResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'ANUNCIO' })
  tipo!: string;

  @ApiProperty({ example: 'Novo anúncio: Sofá 3 lugares' })
  texto!: string;

  @ApiProperty({ type: Number, nullable: true, example: 7 })
  refId!: number | null;

  @ApiProperty()
  lida!: boolean;

  @ApiProperty({ example: '2026-11-07T12:00:00.000Z' })
  criadaEm!: string;

  static fromEntity(entity: Notificacao): NotificacaoResponseDto {
    return {
      id: entity.id,
      tipo: entity.tipo,
      texto: entity.texto,
      refId: entity.refId,
      lida: entity.lida,
      criadaEm: entity.criadaEm.toISOString(),
    };
  }
}

export class NotificacoesPaginadasResponseDto {
  @ApiProperty({ type: [NotificacaoResponseDto] })
  data!: NotificacaoResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ContagemNaoLidasResponseDto {
  @ApiProperty({ example: 3 })
  naoLidas!: number;
}

export class LeituraEmMassaResponseDto {
  @ApiProperty({ example: 3 })
  atualizadas!: number;
}
