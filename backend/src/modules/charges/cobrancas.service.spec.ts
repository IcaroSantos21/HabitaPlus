import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { PerfilUsuario, StatusCobranca } from '../../database/entities/enums';
import { Unidade } from '../../database/entities/unidade.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import {
  ChargesRepository,
  ParametrosGeracao,
  ResultadoGeracao,
} from './cobrancas.repository';
import { Cobrancas } from './cobrancas.service';
import { ChargeFiltersDto } from './dto/cobranca-filters.dto';

const morador: AuthUserDto = {
  id: 1,
  nome: 'Maria',
  email: 'maria@example.com',
  perfil: PerfilUsuario.MORADOR,
};
const sindico: AuthUserDto = {
  ...morador,
  id: 2,
  perfil: PerfilUsuario.SINDICO,
};
const admin: AuthUserDto = { ...morador, id: 3, perfil: PerfilUsuario.ADMIN };

function criarCobranca(overrides: Partial<Cobranca> = {}): Cobranca {
  return {
    id: 10,
    unidade: { id: 5, bloco: 'B', numero: '302' } as Unidade,
    competencia: '2026-11-01' as unknown as Date,
    valor: 650,
    vencimento: '2026-11-10' as unknown as Date,
    status: StatusCobranca.PENDENTE,
    stripeSessionId: null,
    ...overrides,
  };
}

function filtros(overrides: Partial<ChargeFiltersDto> = {}): ChargeFiltersDto {
  return Object.assign(new ChargeFiltersDto(), overrides);
}

// Repositório em memória que reproduz a regra do índice único do banco
// (unidade + competência). Serve para exercitar o fluxo do service de ponta a ponta.
class RepositorioEmMemoria {
  readonly cobrancas = new Set<string>();
  constructor(private readonly unidadesOcupadas: number[]) {}

  generateForOccupiedUnits(p: ParametrosGeracao): Promise<ResultadoGeracao> {
    let criadas = 0;
    for (const unidadeId of this.unidadesOcupadas) {
      const chave = `${unidadeId}:${p.competencia}`;
      if (!this.cobrancas.has(chave)) {
        this.cobrancas.add(chave);
        criadas++;
      }
    }
    return Promise.resolve({
      totalOcupadas: this.unidadesOcupadas.length,
      criadas,
    });
  }
}

describe('ChargesService', () => {
  const repository = {
    generateForOccupiedUnits: jest.fn(),
    findPaginated: jest.fn(),
    findOneWithUnit: jest.fn(),
    markOverdue: jest.fn(),
    markAsPaid: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  } as unknown as ConfigService<AppConfig, true>;

  const criarService = (repo: unknown = repository): Cobrancas =>
    new Cobrancas(repo as ChargesRepository, config);

  let service: Cobrancas;

  beforeEach(() => {
    jest.resetAllMocks();
    (config.get as jest.Mock).mockReturnValue({
      valorPadrao: 650,
      diaVencimento: 10,
    });
    repository.findPaginated.mockResolvedValue({ items: [], total: 0 });
    service = criarService();
  });

  describe('generate', () => {
    it('deve gerar com o valor e o dia de vencimento configurados', async () => {
      repository.generateForOccupiedUnits.mockResolvedValue({
        totalOcupadas: 120,
        criadas: 118,
      });

      const resultado = await service.generate('2026-11');

      expect(repository.generateForOccupiedUnits).toHaveBeenCalledWith({
        competencia: '2026-11-01',
        valor: 650,
        vencimento: '2026-11-10',
      });
      expect(resultado).toEqual({
        competencia: '2026-11',
        vencimento: '2026-11-10',
        valor: 650,
        totalUnidadesOcupadas: 120,
        criadas: 118,
        jaExistentes: 2,
      });
    });

    it('deve responder com zeros quando não há unidade ocupada', async () => {
      repository.generateForOccupiedUnits.mockResolvedValue({
        totalOcupadas: 0,
        criadas: 0,
      });

      await expect(service.generate('2026-11')).resolves.toMatchObject({
        totalUnidadesOcupadas: 0,
        criadas: 0,
        jaExistentes: 0,
      });
    });

    it('deve ser idempotente: reexecutar a geração não duplica cobranças', async () => {
      const memoria = new RepositorioEmMemoria([1, 2, 3]);
      const comMemoria = criarService(memoria);

      const primeira = await comMemoria.generate('2026-11');
      const segunda = await comMemoria.generate('2026-11');
      const terceira = await comMemoria.generate('2026-11');

      expect(primeira).toMatchObject({ criadas: 3, jaExistentes: 0 });
      expect(segunda).toMatchObject({ criadas: 0, jaExistentes: 3 });
      expect(terceira).toMatchObject({ criadas: 0, jaExistentes: 3 });
      expect(memoria.cobrancas.size).toBe(3);
    });

    it('deve gerar competências diferentes de forma independente', async () => {
      const memoria = new RepositorioEmMemoria([1, 2]);
      const comMemoria = criarService(memoria);

      await comMemoria.generate('2026-11');
      const dezembro = await comMemoria.generate('2026-12');

      expect(dezembro).toMatchObject({ criadas: 2, jaExistentes: 0 });
      expect(memoria.cobrancas.size).toBe(4);
    });

    it('deve respeitar o dia de vencimento da configuração', async () => {
      (config.get as jest.Mock).mockReturnValue({
        valorPadrao: 480.5,
        diaVencimento: 5,
      });
      repository.generateForOccupiedUnits.mockResolvedValue({
        totalOcupadas: 1,
        criadas: 1,
      });

      await service.generate('2027-02');

      expect(repository.generateForOccupiedUnits).toHaveBeenCalledWith({
        competencia: '2027-02-01',
        valor: 480.5,
        vencimento: '2027-02-05',
      });
    });
  });

  describe('listagem', () => {
    it('síndico e admin veem todas as cobranças (sem filtro de morador)', async () => {
      await service.findAll(filtros(), sindico);
      await service.findAll(filtros(), admin);

      expect(repository.findPaginated).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ moradorId: undefined }),
      );
      expect(repository.findPaginated).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ moradorId: undefined }),
      );
    });

    it('morador só vê as cobranças das suas unidades', async () => {
      await service.findAll(filtros(), morador);

      expect(repository.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ moradorId: morador.id }),
      );
    });

    it('/me sempre restringe ao usuário logado, mesmo para síndico', async () => {
      await service.findMine(filtros(), sindico);

      expect(repository.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ moradorId: sindico.id }),
      );
    });

    it('deve repassar os filtros e a paginação ao repositório', async () => {
      await service.findAll(
        filtros({
          competencia: '2026-11',
          status: StatusCobranca.ATRASADA,
          unidadeId: 5,
          pagina: 2,
          limite: 10,
        }),
        sindico,
      );

      expect(repository.findPaginated).toHaveBeenCalledWith({
        competencia: '2026-11',
        status: StatusCobranca.ATRASADA,
        unidadeId: 5,
        moradorId: undefined,
        pagina: 2,
        limite: 10,
      });
    });

    it('deve devolver DTO paginado, sem expor stripeSessionId', async () => {
      repository.findPaginated.mockResolvedValue({
        items: [criarCobranca({ stripeSessionId: 'cs_test_123' })],
        total: 21,
      });

      const resposta = await service.findAll(
        filtros({ pagina: 2, limite: 20 }),
        sindico,
      );

      expect(resposta.meta).toEqual({
        pagina: 2,
        limite: 20,
        total: 21,
        totalPaginas: 2,
      });
      expect(resposta.data[0]).toEqual({
        id: 10,
        unidade: { id: 5, bloco: 'B', numero: '302' },
        competencia: '2026-11',
        valor: 650,
        vencimento: '2026-11-10',
        status: StatusCobranca.PENDENTE,
      });
      expect(resposta.data[0]).not.toHaveProperty('stripeSessionId');
    });
  });

  describe('markOverdue (job de atraso com datas simuladas)', () => {
    it.each([
      [
        'no dia do vencimento ainda não atrasa',
        '2026-11-10T12:00:00Z',
        '2026-11-10',
      ],
      [
        '23:59 de Brasília do dia do vencimento',
        '2026-11-11T02:59:00Z',
        '2026-11-10',
      ],
      [
        '00:00 de Brasília do dia seguinte ao vencimento',
        '2026-11-11T03:00:00Z',
        '2026-11-11',
      ],
      ['semanas depois do vencimento', '2026-12-05T09:00:00Z', '2026-12-05'],
      ['virada de ano', '2027-01-01T02:00:00Z', '2026-12-31'],
    ])('%s', async (_descricao, agora, hojeEsperado) => {
      repository.markOverdue.mockResolvedValue(4);

      const total = await service.markOverdue(new Date(agora));

      expect(repository.markOverdue).toHaveBeenCalledWith(hojeEsperado);
      expect(total).toBe(4);
    });

    it('deve usar o relógio do sistema quando não recebe data', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-11T15:00:00Z'));
      repository.markOverdue.mockResolvedValue(0);

      await service.markOverdue();

      expect(repository.markOverdue).toHaveBeenCalledWith('2026-11-11');
      jest.useRealTimers();
    });

    it('rodar de novo no mesmo dia não marca nada a mais', async () => {
      repository.markOverdue.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

      const agora = new Date('2026-11-11T12:00:00Z');
      expect(await service.markOverdue(agora)).toBe(3);
      expect(await service.markOverdue(agora)).toBe(0);
    });
  });

  describe('registerPayment', () => {
    it('deve registrar o pagamento com a data de hoje em Brasília e devolver a cobrança', async () => {
      repository.markAsPaid.mockResolvedValue(true);
      repository.findOneWithUnit.mockResolvedValue(
        criarCobranca({ status: StatusCobranca.PAGA }),
      );

      const resposta = await service.registerPayment(
        10,
        1,
        new Date('2026-11-12T02:30:00Z'),
      );

      expect(repository.markAsPaid).toHaveBeenCalledWith({
        cobrancaId: 10,
        usuarioId: 1,
        data: '2026-11-11',
      });
      expect(resposta.status).toBe(StatusCobranca.PAGA);
    });

    it('deve ser idempotente: cobrança já paga devolve o estado atual', async () => {
      repository.markAsPaid.mockResolvedValue(false);
      repository.findOneWithUnit.mockResolvedValue(
        criarCobranca({ status: StatusCobranca.PAGA }),
      );

      await expect(service.registerPayment(10, 1)).resolves.toMatchObject({
        id: 10,
        status: StatusCobranca.PAGA,
      });
    });

    it('deve lançar 404 quando a cobrança não existe', async () => {
      repository.markAsPaid.mockResolvedValue(false);
      repository.findOneWithUnit.mockResolvedValue(null);

      await expect(service.registerPayment(99, 1)).rejects.toThrow(
        new NotFoundException('Cobrança não encontrada.'),
      );
    });
  });
});
