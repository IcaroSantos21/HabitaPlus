import { Logger } from '@nestjs/common';
import {
  CronExpression,
  ScheduleModule,
  SchedulerRegistry,
} from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { ChargesOverdueJob } from './cobrancas-overdue.job';
import { Cobrancas } from './cobrancas.service';

describe('ChargesOverdueJob', () => {
  const chargesService = { markOverdue: jest.fn() };
  const job = new ChargesOverdueJob(
    chargesService as unknown as Cobrancas,
  );

  let erroSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    erroSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  it('deve acionar a marcação de atrasadas no service', async () => {
    chargesService.markOverdue.mockResolvedValue(2);

    await job.run();

    expect(chargesService.markOverdue).toHaveBeenCalledTimes(1);
  });

  it('não deve propagar erro: a próxima execução refaz o trabalho', async () => {
    chargesService.markOverdue.mockRejectedValue(new Error('banco fora'));

    await expect(job.run()).resolves.toBeUndefined();
    expect(erroSpy).toHaveBeenCalled();
  });

  it('deve estar agendado todo dia à 01:00 no fuso de Brasília', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        ChargesOverdueJob,
        { provide: Cobrancas, useValue: chargesService },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const cron = app.get(SchedulerRegistry).getCronJob('cobrancas-atrasadas');

      expect(cron.cronTime.source).toBe(CronExpression.EVERY_DAY_AT_1AM);
      expect(cron.cronTime.timeZone).toBe('America/Sao_Paulo');
    } finally {
      await app.close();
    }
  });
});
