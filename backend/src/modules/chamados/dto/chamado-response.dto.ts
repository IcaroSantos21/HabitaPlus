import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { Chamado } from '../../../database/entities/chamado.entity';
import { StatusChamado } from '../../../database/entities/enums';

export class ChamadoUsuarioDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Maria Silva' })
  nome!: string;
}

export class ChamadoUnidadeDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'B' })
  bloco!: string;

  @ApiProperty({ example: '302' })
  numero!: string;
}

export class ChamadoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: ChamadoUsuarioDto })
  usuario!: ChamadoUsuarioDto;

  @ApiProperty({ type: ChamadoUnidadeDto, nullable: true })
  unidade!: ChamadoUnidadeDto | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  areaComum!: string | null;

  @ApiProperty({ example: 'eletrica' })
  categoria!: string;

  @ApiProperty({ type: String, nullable: true, example: 'elevador' })
  equipamento!: string | null;

  @ApiProperty({ example: 'O elevador social está parando entre os andares.' })
  descricao!: string;

  @ApiProperty({ enum: StatusChamado })
  status!: StatusChamado;

  @ApiProperty({ type: String, format: 'date-time' })
  abertoEm!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  encerradoEm!: Date | null;

  // Expõe só o necessário: nunca devolve a entity (e seus campos internos).
  static fromEntity(chamado: Chamado): ChamadoResponseDto {
    return {
      id: chamado.id,
      usuario: { id: chamado.usuario.id, nome: chamado.usuario.nome },
      unidade: chamado.unidade
        ? {
            id: chamado.unidade.id,
            bloco: chamado.unidade.bloco,
            numero: chamado.unidade.numero,
          }
        : null,
      areaComum: chamado.areaComum,
      categoria: chamado.categoria,
      equipamento: chamado.equipamento,
      descricao: chamado.descricao,
      status: chamado.status,
      abertoEm: chamado.abertoEm,
      encerradoEm: chamado.encerradoEm,
    };
  }
}

export class PaginatedTicketsResponseDto {
  @ApiProperty({ type: [ChamadoResponseDto] })
  data!: ChamadoResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
