import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transacao } from '../../database/entities/transacao.entity';
import { TransacoesController } from './transacoes.controller';
import { TransacoesRepository } from './transacoes.repository';
import { TransacoesService } from './transacoes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transacao])],
  controllers: [TransacoesController],
  providers: [TransacoesRepository, TransacoesService],
})
export class TransacoesModule {}
