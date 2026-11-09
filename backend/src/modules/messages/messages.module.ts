import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anuncio } from '../../database/entities/anuncio.entity';
import { Mensagem } from '../../database/entities/mensagem.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ListingMessagesController } from './listing-messages.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mensagem, Anuncio]), NotificationsModule],
  controllers: [ListingMessagesController, MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
