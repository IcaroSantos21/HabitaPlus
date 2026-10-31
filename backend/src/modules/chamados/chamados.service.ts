import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaginatedResponseDto,
  paginate as paginacao,
} from '../../common/dto/paginated-response.dto';
import { PerfilUsuario, StatusChamado } from '../../database/entities/enums';
import { Unidade } from '../../database/entities/unidade.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import { FiltrosChamadoDto } from './dto/filtros-chamado.dto';
import { HistoricoChamadoQueryDto } from './dto/historico-chamado-query.dto';
import { ChamadoResponseDto } from './dto/chamado-response.dto';
import { EstatisticasChamadoResponseDto } from './dto/estatisticas-chamados-response.dto';
import { AtualizarStatusChamadoDto } from './dto/atualizar-status-chamado.dto';
import { validarTransicaoDeStatus } from './rules/chamado-status-transitions';
import { ChamadosRepository } from './chamados.repository';
import { normalizarIdentificador } from './utils/normalizar-identificador';

@Injectable()
export class ChamadosService {
  constructor(
    private readonly chamadosRepository: ChamadosRepository,
    @InjectRepository(Vinculo)
    private readonly vinculosRepository: Repository<Vinculo>,
    @InjectRepository(Unidade)
    private readonly unidadesRepository: Repository<Unidade>,
  ) {}

  async create(
    input: CriarChamadoDto,
    user: AuthUserDto,
  ): Promise<ChamadoResponseDto> {
    const unidadeId = input.unidadeId ?? null;
    const areaComum = input.areaComum ?? null;

    if (unidadeId === null && areaComum === null) {
      throw new BadRequestException(
        'Informe a unidade ou a área comum do chamado.',
      );
    }
    if (unidadeId !== null && areaComum !== null) {
      throw new BadRequestException(
        'Informe apenas a unidade ou a área comum, não os dois.',
      );
    }

    const categoria = this.toIdentificador('categoria', input.categoria);
    const equipamento = this.toIdentificador('equipamento', input.equipamento);
    const area =
      areaComum === null ? null : this.toIdentificador('areaComum', areaComum);

    if (unidadeId !== null) {
      await this.garantirAcessoAUnidade(unidadeId, user);
    }

    const chamado = await this.chamadosRepository.createAndLoad({
      usuarioId: user.id,
      unidadeId,
      areaComum: area,
      categoria,
      equipamento,
      descricao: input.descricao,
      status: StatusChamado.ABERTO,
      abertoEm: new Date(),
    });
    return ChamadoResponseDto.fromEntity(chamado);
  }

  async buscaTodos(
    filtros: FiltrosChamadoDto,
    user: AuthUserDto,
  ): Promise<PaginatedResponseDto<ChamadoResponseDto>> {
    const { items, total } = await this.chamadosRepository.findPaginated({
      // Só síndico/admin veem tudo; qualquer outro perfil enxerga apenas o que é seu.
      usuarioId: this.isManager(user) ? undefined : user.id,
      status: filtros.status,
      categoria: this.toIdentificadorOpcional(filtros.categoria),
      equipamento: this.toIdentificadorOpcional(filtros.equipamento),
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
    return paginacao(
      items.map((item) => ChamadoResponseDto.fromEntity(item)),
      total,
      filtros.pagina,
      filtros.limite,
    );
  }

  async atualizarStatus(
    id: number,
    input: AtualizarStatusChamadoDto,
  ): Promise<ChamadoResponseDto> {
    const chamado = await this.chamadosRepository.findOneWithRelations(id);
    if (!chamado) {
      throw new NotFoundException('Chamado não encontrado');
    }

    validarTransicaoDeStatus(chamado.status, input.status);

    const encerradoEm =
      input.status === StatusChamado.ENCERRADO ? new Date() : null;
    const atualizado = await this.chamadosRepository.updateStatusIfCurrent(
      id,
      chamado.status,
      input.status,
      encerradoEm,
    );
    if (!atualizado) {
      throw new ConflictException(
        'O chamado foi alterado por outra pessoa. Atualize e tente novamente.',
      );
    }

    chamado.status = input.status;
    chamado.encerradoEm = encerradoEm;
    return ChamadoResponseDto.fromEntity(chamado);
  }

  async buscarHistorico(
    query: HistoricoChamadoQueryDto,
  ): Promise<PaginatedResponseDto<ChamadoResponseDto>> {
    const equipamento = this.toIdentificadorOpcional(query.equipamento);
    const areaComum = this.toIdentificadorOpcional(query.area);
    if (!equipamento && !areaComum) {
      throw new BadRequestException(
        'Informe ao menos um filtro: equipamento ou area.',
      );
    }

    const { items, total } = await this.chamadosRepository.findPaginated({
      equipamento,
      areaComum,
      pagina: query.pagina,
      limite: query.limite,
    });
    return paginacao(
      items.map((item) => ChamadoResponseDto.fromEntity(item)),
      total,
      query.pagina,
      query.limite,
    );
  }

  async getStatus(): Promise<EstatisticasChamadoResponseDto> {
    const linhas = await this.chamadosRepository.countByEquipmentAndMonth();

    const totals = new Map<string, number>();
    for (const row of linhas) {
      totals.set(
        row.equipamento,
        (totals.get(row.equipamento) ?? 0) + row.total,
      );
    }

    const porEquipamento = [...totals]
      .map(([equipamento, total]) => ({ equipamento, total }))
      .sort(
        (a, b) =>
          b.total - a.total || a.equipamento.localeCompare(b.equipamento),
      );

    return { porEquipamento, porEquipamentoEMes: linhas };
  }

  private isManager(user: AuthUserDto): boolean {
    return (
      user.perfil === PerfilUsuario.SINDICO ||
      user.perfil === PerfilUsuario.ADMIN
    );
  }

  // Morador só abre chamado em unidade onde tem vínculo; gestor, em qualquer unidade existente.
  private async garantirAcessoAUnidade(
    unidadeId: number,
    user: AuthUserDto,
  ): Promise<void> {
    if (!this.isManager(user)) {
      const vinculado = await this.vinculosRepository.exists({
        where: { usuario: { id: user.id }, unidade: { id: unidadeId } },
      });
      if (!vinculado) {
        throw new ForbiddenException(
          'Você não possui vínculo com esta unidade.',
        );
      }
      return;
    }

    const existe = await this.unidadesRepository.exists({
      where: { id: unidadeId },
    });
    if (!existe) {
      throw new NotFoundException('Unidade não encontrada.');
    }
  }

  private toIdentificador(campo: string, valor: string): string {
    const identificador = normalizarIdentificador(valor);
    if (!identificador) {
      throw new BadRequestException(
        `O campo "${campo}" deve conter letras ou números.`,
      );
    }
    return identificador;
  }

  private toIdentificadorOpcional(valor?: string): string | undefined {
    return valor ? normalizarIdentificador(valor) || undefined : undefined;
  }
}
