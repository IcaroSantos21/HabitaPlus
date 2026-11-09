import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FUSO_DO_CONDOMINIO } from '../charges/utils/datas';
import { NotificationsDiariasService } from './notifications-diarias.service';

@Injectable()
export class NotificationsDiariasJob {
  private readonly logger = new Logger(NotificationsDiariasJob.name);

  constructor(
    private readonly notificationsDiariasService: NotificationsDiariasService,
  ) {}

  @Cron('0 5 1 * * *', {
    name: 'notificacoes-diarias',
    timeZone: FUSO_DO_CONDOMINIO,
  })
  async run(agora: Date = new Date()): Promise<void> {
    try {
      await this.notificationsDiariasService.run(agora);
    } catch (error) {
      this.logger.error(
        'Falha ao gerar notificações diárias',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
