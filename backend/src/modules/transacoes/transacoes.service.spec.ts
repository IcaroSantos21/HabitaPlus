import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TipoTransacao } from '../../database/entities/enums';
import { Usuario } from '../../database/entities/usuario.entity';
import { Transacao } from '../../database/entities/transacao.entity';
import { CriarTransacaoDto } from './dto/criar-transacao.dto';
import { TransacaoQueryDto } from './dto/transacao-query.dto';
import { TransacoesRepository } from './transacoes.repository';
import { TransacoesService } from './transacoes.service';

function criarTransacao(overrides: Partial<Transacao> = {}): Transacao {
  return {
    id: 10,
    usuario: { id: 2 } as Usuario,
    tipo: TipoTransacao.DESPESA,
    categoria: 'energia',
    valor: 100,
    competencia: new Date('2026-10-01T00:00:00.000Z'),
    data: new Date('2026-10-10T00:00:00.000Z'),
    descricao: null,
    ...overrides,
  };
}

describe('TransacoesService', () => {
  const repository = {
    createAndLoad: jest.fn(),
    findPaginated: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    sumByMonth: jest.fn(),
  };
  const service = new TransacoesService(
    repository as unknown as TransacoesRepository,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repository.createAndLoad.mockResolvedValue(criarTransacao());
    repository.findPaginated.mockResolvedValue({ items: [], total: 0 });
    repository.save.mockImplementation((entity: Transacao) => entity);
  });

  it.each([0, -1])(
    'deve rejeitar valor %p antes de persistir',
    async (valor) => {
      const input = {
        tipo: TipoTransacao.DESPESA,
        categoria: 'energia',
        valor,
        competencia: '2026-10',
        data: '2026-10-10',
      } as CriarTransacaoDto;

      await expect(service.create(input, 2)).rejects.toThrow(
        'O valor deve ser maior que zero.',
      );
      expect(repository.createAndLoad).not.toHaveBeenCalled();
    },
  );

  it('deve aceitar valor positivo e normalizar categoria de despesa', async () => {
    const input = {
      tipo: TipoTransacao.DESPESA,
      categoria: ' Energia ',
      valor: 1250.5,
      competencia: '2026-10',
      data: '2026-10-10',
    } as CriarTransacaoDto;

    await service.create(input, 2);
    expect(repository.createAndLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario: { id: 2 },
        categoria: 'energia',
        valor: 1250.5,
      }),
    );
  });

  it('deve restringir despesa às categorias sugeridas', async () => {
    const input = {
      tipo: TipoTransacao.DESPESA,
      categoria: 'internet',
      valor: 100,
      competencia: '2026-10',
      data: '2026-10-10',
    } as CriarTransacaoDto;

    await expect(service.create(input, 2)).rejects.toThrow(BadRequestException);
    expect(repository.createAndLoad).not.toHaveBeenCalled();
  });

  it('deve retornar paginação com filtros normalizados', async () => {
    const query = {
      pagina: 2,
      limite: 20,
      competencia: '2026-10',
      tipo: TipoTransacao.DESPESA,
      categoria: ' Energia ',
    } as TransacaoQueryDto;

    const resposta = await service.findAll(query);
    expect(repository.findPaginated).toHaveBeenCalledWith({
      competencia: '2026-10',
      tipo: TipoTransacao.DESPESA,
      categoria: 'energia',
      pagina: 2,
      limite: 20,
    });
    expect(resposta.meta.totalPaginas).toBe(0);
  });

  it('deve impedir atualização de uma transação inexistente', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
  });

  it('deve remover uma transação existente', async () => {
    const transacao = criarTransacao();
    repository.findOne.mockResolvedValue(transacao);
    await service.remove(10);
    expect(repository.remove).toHaveBeenCalledWith(transacao);
  });

  it('deve somar receitas, despesas e saldo por mês incluindo mês sem movimento', async () => {
    repository.sumByMonth.mockResolvedValue([
      { month: '2026-01', receitas: '1000.00', despesas: '250.00' },
      { month: '2026-03', receitas: '300.00', despesas: '100.00' },
    ]);

    const resposta = await service.monthlySummary({
      from: '2026-01',
      to: '2026-03',
    });

    expect(resposta).toEqual([
      { month: '2026-01', receitas: 1000, despesas: 250, saldo: 750 },
      { month: '2026-02', receitas: 0, despesas: 0, saldo: 0 },
      { month: '2026-03', receitas: 300, despesas: 100, saldo: 200 },
    ]);
  });

  it('deve rejeitar intervalo invertido no resumo mensal', async () => {
    await expect(
      service.monthlySummary({ from: '2026-11', to: '2026-01' }),
    ).rejects.toThrow(
      'O parâmetro from deve ser anterior ou igual ao parâmetro to.',
    );
    expect(repository.sumByMonth).not.toHaveBeenCalled();
  });
});
