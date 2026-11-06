import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaginatedResponseDto,
  paginate,
} from '../../common/dto/paginated-response.dto';
import { AppConfig } from '../../config/configuration';
import { PerfilUsuario } from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { CobrancasRepository } from './cobrancas.repository';
import { FiltrosCobrancaDto } from './dto/filtros-cobranca.dto';
import {
  CobrancaResponseDto,
  GerarCobrancasResponseDto,
} from './dto/cobranca-response.dto';
import {
  dataDeHoje,
  primeiroDiaDaCompetencia,
  vencimentoDaCompetencia,
} from './utils/datas';

@Injectable()
export class CobrancasService {
  private readonly logger = new Logger(CobrancasService.name);

  constructor(
    private readonly cobrancasRepository: CobrancasRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async gerar(competencia: string): Promise<GerarCobrancasResponseDto> {
    const { valorPadrao, diaVencimento } = this.config.get('charges', {
      infer: true,
    });
    const vencimento = vencimentoDaCompetencia(competencia, diaVencimento);

    const { totalOcupadas, criadas } =
      await this.cobrancasRepository.generateForOccupiedUnits({
        competencia: primeiroDiaDaCompetencia(competencia),
        valor: valorPadrao,
        vencimento,
      });

    return {
      competencia,
      vencimento,
      valor: valorPadrao,
      totalUnidadesOcupadas: totalOcupadas,
      criadas,
      jaExistentes: totalOcupadas - criadas,
    };
  }

  buscarTodas(
    filtros: FiltrosCobrancaDto,
    user: AuthUserDto,
  ): Promise<PaginatedResponseDto<CobrancaResponseDto>> {
    // Só síndico/admin veem tudo; morador enxerga apenas as suas unidades.
    return this.listar(filtros, this.ehGestor(user) ? undefined : user.id);
  }

  buscarMinhas(
    filtros: FiltrosCobrancaDto,
    user: AuthUserDto,
  ): Promise<PaginatedResponseDto<CobrancaResponseDto>> {
    return this.listar(filtros, user.id);
  }

  // Chamado pelo job diário. Recebe o instante atual para poder ser simulado em testes.
  async marcarComoAtrasado(agora: Date = new Date()): Promise<number> {
    const hoje = dataDeHoje(agora);
    const total = await this.cobrancasRepository.markOverdue(hoje);
    this.logger.log(`Cobranças marcadas como ATRASADA em ${hoje}: ${total}`);
    return total;
  }

  // Ponto de entrada interno (sem rota HTTP) para o módulo de pagamentos/webhook.
  // Idempotente: pagar uma cobrança já paga não cria uma segunda receita.
  async registrarPagamento(
    cobrancaId: number,
    usuarioId: number,
    agora: Date = new Date(),
  ): Promise<CobrancaResponseDto> {
    await this.cobrancasRepository.markAsPaid({
      cobrancaId,
      usuarioId,
      data: dataDeHoje(agora),
    });

    const cobranca = await this.cobrancasRepository.findOneWithUnit(cobrancaId);
    if (!cobranca) {
      throw new NotFoundException('Cobrança não encontrada.');
    }
    return CobrancaResponseDto.fromEntity(cobranca);
  }

  private async listar(
    filtros: FiltrosCobrancaDto,
    moradorId?: number,
  ): Promise<PaginatedResponseDto<CobrancaResponseDto>> {
    const { items, total } = await this.cobrancasRepository.findPaginated({
      competencia: filtros.competencia,
      status: filtros.status,
      unidadeId: filtros.unidadeId,
      moradorId,
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
    return paginate(
      items.map((item) => CobrancaResponseDto.fromEntity(item)),
      total,
      filtros.pagina,
      filtros.limite,
    );
  }

  private ehGestor(user: AuthUserDto): boolean {
    return (
      user.perfil === PerfilUsuario.SINDICO ||
      user.perfil === PerfilUsuario.ADMIN
    );
  }
}
