import { Logger } from '@nestjs/common';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { NotificationsDiariasService } from './notifications-diarias.service';
import { NotificationsDiariasJob } from './notifications-diarias.job';

describe('NotificationsDiariasJob', () => {
  const notificationsService = { run: jest.fn() };
  const job = new NotificationsDiariasJob(
    notificationsService as unknown as NotificationsDiariasService,
  );
  let erroSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    erroSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    erroSpy.mockRestore();
  });

  it('aciona a geração de notificações com o instante recebido', async () => {
    const agora = new Date('2026-11-07T04:05:00.000Z');
    notificationsService.run.mockResolvedValue(undefined);

    await job.run(agora);

    expect(notificationsService.run).toHaveBeenCalledWith(agora);
  });

  it('registra a falha sem derrubar o processo do backend', async () => {
    notificationsService.run.mockRejectedValue(new Error('banco fora'));

    await expect(job.run()).resolves.toBeUndefined();
    expect(erroSpy).toHaveBeenCalled();
  });

  it('está agendado diariamente às 01:05 no fuso de Brasília', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        NotificationsDiariasJob,
        {
          provide: NotificationsDiariasService,
          useValue: notificationsService,
        },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const cron = app
        .get(SchedulerRegistry)
        .getCronJob('notificacoes-diarias');

      expect(cron.cronTime.source).toBe('0 5 1 * * *');
      expect(cron.cronTime.timeZone).toBe('America/Sao_Paulo');
    } finally {
      await app.close();
    }
  });
});
