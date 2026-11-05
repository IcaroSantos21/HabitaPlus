import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaginatedResponseDto,
  paginate,
} from '../../common/dto/paginated-response.dto';
import { AppConfig } from '../../config/configuration';
import { PerfilUsuario } from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { ChargesRepository } from './cobrancas.repository';
import { ChargeFiltersDto } from './dto/cobranca-filters.dto';
import {
  ChargeResponseDto,
  GenerateChargesResponseDto,
} from './dto/cobranca-response.dto';
import {
  dataDeHoje,
  primeiroDiaDaCompetencia,
  vencimentoDaCompetencia,
} from './utils/datas';

@Injectable()
export class Cobrancas {
  private readonly logger = new Logger(Cobrancas.name);

  constructor(
    private readonly cobrancasRepository: ChargesRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async generate(competencia: string): Promise<GenerateChargesResponseDto> {
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

  findAll(
    filtros: ChargeFiltersDto,
    user: AuthUserDto,
  ): Promise<PaginatedResponseDto<ChargeResponseDto>> {
    // Só síndico/admin veem tudo; morador enxerga apenas as suas unidades.
    return this.list(filtros, this.isManager(user) ? undefined : user.id);
  }

  findMine(
    filtros: ChargeFiltersDto,
    user: AuthUserDto,
  ): Promise<PaginatedResponseDto<ChargeResponseDto>> {
    return this.list(filtros, user.id);
  }

  // Chamado pelo job diário. Recebe o instante atual para poder ser simulado em testes.
  async markOverdue(agora: Date = new Date()): Promise<number> {
    const hoje = dataDeHoje(agora);
    const total = await this.cobrancasRepository.markOverdue(hoje);
    this.logger.log(`Cobranças marcadas como ATRASADA em ${hoje}: ${total}`);
    return total;
  }

  // Ponto de entrada interno (sem rota HTTP) para o módulo de pagamentos/webhook.
  // Idempotente: pagar uma cobrança já paga não cria uma segunda receita.
  async registerPayment(
    cobrancaId: number,
    usuarioId: number,
    agora: Date = new Date(),
  ): Promise<ChargeResponseDto> {
    await this.cobrancasRepository.markAsPaid({
      cobrancaId,
      usuarioId,
      data: dataDeHoje(agora),
    });

    const cobranca = await this.cobrancasRepository.findOneWithUnit(cobrancaId);
    if (!cobranca) {
      throw new NotFoundException('Cobrança não encontrada.');
    }
    return ChargeResponseDto.fromEntity(cobranca);
  }

  private async list(
    filtros: ChargeFiltersDto,
    moradorId?: number,
  ): Promise<PaginatedResponseDto<ChargeResponseDto>> {
    const { items, total } = await this.cobrancasRepository.findPaginated({
      competencia: filtros.competencia,
      status: filtros.status,
      unidadeId: filtros.unidadeId,
      moradorId,
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
    return paginate(
      items.map((item) => ChargeResponseDto.fromEntity(item)),
      total,
      filtros.pagina,
      filtros.limite,
    );
  }

  private isManager(user: AuthUserDto): boolean {
    return (
      user.perfil === PerfilUsuario.SINDICO ||
      user.perfil === PerfilUsuario.ADMIN
    );
  }
}
