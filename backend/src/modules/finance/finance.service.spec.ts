import { BadRequestException } from '@nestjs/common';
import { TransacoesService } from '../transacoes/transacoes.service';
import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const financeRepository = {
    sumByMonth: jest.fn(),
    sumOverdueByUnit: jest.fn(),
    countPending: jest.fn(),
  };
  const transacoesService = { monthlySummary: jest.fn() };
  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(
      financeRepository as unknown as FinanceRepository,
      transacoesService as unknown as TransacoesService,
    );
  });

  describe('inadimplencia', () => {
    it('calcula o cenário conhecido: 10 cobranças de 650, 2 atrasadas = 20%', async () => {
      // Outubro: 5 cobranças, 2 atrasadas. Novembro: 5 cobranças, nenhuma atrasada.
      financeRepository.sumByMonth.mockResolvedValue([
        {
          competencia: '2026-10',
          totalCobrado: '3250.00',
          totalEmAtraso: '1300.00',
        },
        {
          competencia: '2026-11',
          totalCobrado: '3250.00',
          totalEmAtraso: '0.00',
        },
      ]);
      financeRepository.sumOverdueByUnit.mockResolvedValue([
        {
          unidadeId: '2',
          bloco: 'B',
          numero: '202',
          totalEmAtraso: '650.00',
          cobrancasAtrasadas: '1',
        },
        {
          unidadeId: '1',
          bloco: 'A',
          numero: '101',
          totalEmAtraso: '650.00',
          cobrancasAtrasadas: '1',
        },
      ]);

      const resposta = await service.inadimplencia({});

      expect(resposta.totalEmAtraso).toBe(1300);
      expect(resposta.percentual).toBe(20);
      expect(resposta.porMes).toEqual([
        {
          competencia: '2026-10',
          totalCobrado: 3250,
          totalEmAtraso: 1300,
          percentual: 40,
        },
        {
          competencia: '2026-11',
          totalCobrado: 3250,
          totalEmAtraso: 0,
          percentual: 0,
        },
      ]);
      // Empate no valor: ordena por bloco e número.
      expect(resposta.porUnidade).toEqual([
        {
          unidadeId: 1,
          bloco: 'A',
          numero: '101',
          totalEmAtraso: 650,
          cobrancasAtrasadas: 1,
        },
        {
          unidadeId: 2,
          bloco: 'B',
          numero: '202',
          totalEmAtraso: 650,
          cobrancasAtrasadas: 1,
        },
      ]);
    });

    it('ordena as unidades da maior dívida para a menor', async () => {
      financeRepository.sumByMonth.mockResolvedValue([]);
      financeRepository.sumOverdueByUnit.mockResolvedValue([
        {
          unidadeId: 1,
          bloco: 'A',
          numero: '101',
          totalEmAtraso: '650.00',
          cobrancasAtrasadas: 1,
        },
        {
          unidadeId: 2,
          bloco: 'B',
          numero: '202',
          totalEmAtraso: '1950.00',
          cobrancasAtrasadas: 3,
        },
      ]);

      const resposta = await service.inadimplencia({});

      expect(resposta.porUnidade.map((unidade) => unidade.unidadeId)).toEqual([
        2, 1,
      ]);
    });

    it('devolve zeros quando não há cobranças no período', async () => {
      financeRepository.sumByMonth.mockResolvedValue([]);
      financeRepository.sumOverdueByUnit.mockResolvedValue([]);

      await expect(
        service.inadimplencia({ from: '2026-01', to: '2026-02' }),
      ).resolves.toEqual({
        totalEmAtraso: 0,
        percentual: 0,
        porUnidade: [],
        porMes: [],
      });
      expect(financeRepository.sumByMonth).toHaveBeenCalledWith(
        '2026-01',
        '2026-02',
      );
    });

    it('rejeita período com from maior que to', async () => {
      await expect(
        service.inadimplencia({ from: '2026-11', to: '2026-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(financeRepository.sumByMonth).not.toHaveBeenCalled();
    });
  });

  describe('dashboard', () => {
    it('monta o resumo do mês atual (fuso de Brasília)', async () => {
      transacoesService.monthlySummary.mockResolvedValue([
        { month: '2026-11', receitas: 8000, despesas: 5000, saldo: 3000 },
      ]);
      financeRepository.sumByMonth.mockResolvedValue([
        {
          competencia: '2026-11',
          totalCobrado: '6500.00',
          totalEmAtraso: '650.00',
        },
      ]);
      financeRepository.countPending.mockResolvedValue(4);

      const resposta = await service.dashboard(
        {},
        new Date('2026-11-07T15:00:00Z'),
      );

      expect(transacoesService.monthlySummary).toHaveBeenCalledWith({
        from: '2026-11',
        to: '2026-11',
      });
      expect(resposta).toEqual({
        receitaMes: 8000,
        despesaMes: 5000,
        saldoMes: 3000,
        inadimplenciaPercentual: 10,
        cobrancasPendentes: 4,
      });
    });

    it('usa a competência informada e devolve 0% quando o mês não tem cobranças', async () => {
      transacoesService.monthlySummary.mockResolvedValue([
        { month: '2026-05', receitas: 0, despesas: 0, saldo: 0 },
      ]);
      financeRepository.sumByMonth.mockResolvedValue([]);
      financeRepository.countPending.mockResolvedValue(0);

      const resposta = await service.dashboard({ competencia: '2026-05' });

      expect(financeRepository.countPending).toHaveBeenCalledWith('2026-05');
      expect(resposta.inadimplenciaPercentual).toBe(0);
    });
  });
});
