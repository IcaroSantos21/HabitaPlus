import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chamado } from '../../database/entities/chamado.entity';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { Notificacao } from '../../database/entities/notificacao.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsDiariasJob } from './notifications-diarias.job';
import { NotificationsDiariasService } from './notifications-diarias.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notificacao,
      ContratoLocacao,
      Cobranca,
      Chamado,
      Usuario,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsDiariasService,
    NotificationsDiariasJob,
  ],
  exports: [NotificationsService], // é isso que deixa os outros módulos usarem o notify
})
export class NotificationsModule {}
