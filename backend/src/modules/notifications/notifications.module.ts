import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacao } from '../../database/entities/notificacao.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacao])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // é isso que deixa os outros módulos usarem o notify
})
export class NotificationsModule {}