import { Repository } from 'typeorm';
import { Chamado } from '../../database/entities/chamado.entity';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsDiariasService } from './notifications-diarias.service';

describe('NotificationsDiariasService', () => {
  const contratosRepository = { query: jest.fn() };
  const cobrancasRepository = { query: jest.fn() };
  const chamadosRepository = { query: jest.fn() };
  const usuariosRepository = { query: jest.fn() };
  const notificationsService = { notifyManyOnce: jest.fn() };
  let service: NotificationsDiariasService;

  beforeEach(() => {
    jest.clearAllMocks();
    usuariosRepository.query.mockResolvedValue([{ id: 90 }]);
    contratosRepository.query.mockResolvedValue([
      { id: 10, fim: '2026-11-20', bloco: 'A', numero: '101' },
    ]);
    cobrancasRepository.query.mockResolvedValue([
      {
        cobranca_id: 20,
        vencimento: '2026-11-10',
        bloco: 'A',
        numero: '101',
        usuario_id: 1,
      },
      {
        cobranca_id: 21,
        vencimento: '2026-11-06',
        bloco: 'B',
        numero: '202',
        usuario_id: 2,
      },
      {
        cobranca_id: 21,
        vencimento: '2026-11-06',
        bloco: 'B',
        numero: '202',
        usuario_id: null,
      },
    ]);
    chamadosRepository.query.mockResolvedValue([
      { equipamento: 'elevador', total: 3, ref_id: 31 },
    ]);
    service = new NotificationsDiariasService(
      contratosRepository as unknown as Repository<ContratoLocacao>,
      cobrancasRepository as unknown as Repository<Cobranca>,
      chamadosRepository as unknown as Repository<Chamado>,
      usuariosRepository as unknown as Repository<Usuario>,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('gera os alertas certos usando uma data simulada', async () => {
    const agora = new Date('2026-11-07T16:30:00.000Z');

    await service.run(agora);

    expect(contratosRepository.query).toHaveBeenCalledWith(expect.any(String), [
      '2026-11-07',
      '2026-12-07',
      'ENCERRADO',
    ]);
    expect(cobrancasRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE c."status" <> $3'),
      ['2026-11-07', '2026-11-10', 'PAGA'],
    );
    expect(chamadosRepository.query).toHaveBeenCalledWith(expect.any(String), [
      '2026-08-10',
      '2026-11-07',
    ]);
    expect(notificationsService.notifyManyOnce).toHaveBeenCalledTimes(4);
    expect(notificationsService.notifyManyOnce).toHaveBeenCalledWith(
      [90],
      'ALERTA',
      expect.stringContaining('vence em 2026-11-20'),
      'contrato-vencendo:10:2026-11-07',
      agora,
      10,
    );
    expect(notificationsService.notifyManyOnce).toHaveBeenCalledWith(
      [1],
      'COBRANCA',
      expect.stringContaining('vence em 2026-11-10'),
      'cobranca-vencendo:20:2026-11-07',
      agora,
      20,
    );
    expect(notificationsService.notifyManyOnce).toHaveBeenCalledWith(
      [2, 90],
      'COBRANCA',
      expect.stringContaining('está atrasada'),
      'cobranca-atrasada:21:2026-11-07',
      agora,
      21,
    );
    expect(notificationsService.notifyManyOnce).toHaveBeenCalledWith(
      [90],
      'ALERTA',
      expect.stringContaining('3 chamados nos últimos 90 dias'),
      expect.stringMatching(/^manutencao-recorrente:[a-f0-9]{64}:2026-11-07$/),
      agora,
      31,
    );
  });

  it('reutiliza as mesmas chaves idempotentes ao executar duas vezes no dia', async () => {
    const agora = new Date('2026-11-07T16:30:00.000Z');

    await service.run(agora);
    const chavesDaPrimeiraExecucao =
      notificationsService.notifyManyOnce.mock.calls.map(
        (call: unknown[]) => call[3],
      );

    await service.run(agora);
    const chavesDaSegundaExecucao =
      notificationsService.notifyManyOnce.mock.calls
        .slice(4)
        .map((call: unknown[]) => call[3]);

    expect(chavesDaSegundaExecucao).toEqual(chavesDaPrimeiraExecucao);
  });
});
