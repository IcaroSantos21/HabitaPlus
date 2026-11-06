import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CobrancasService } from './cobrancas.service';
import { FUSO_DO_CONDOMINIO } from './utils/datas';

@Injectable()
export class CobrancasAtrasadasJob {
  private readonly logger = new Logger(CobrancasAtrasadasJob.name);

  constructor(private readonly cobrancasService: CobrancasService) {}

  // 01:00 de Brasília: o dia do vencimento já terminou para todo mundo.
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'cobrancas-atrasadas',
    timeZone: FUSO_DO_CONDOMINIO,
  })
  async run(): Promise<void> {
    try {
      await this.cobrancasService.marcarComoAtrasado();
    } catch (error) {
      // Falha do job não pode derrubar a API; a próxima execução refaz tudo.
      this.logger.error(
        'Falha ao marcar cobranças atrasadas',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
