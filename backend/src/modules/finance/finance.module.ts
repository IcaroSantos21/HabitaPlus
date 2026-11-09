import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { TransacoesModule } from '../transacoes/transacoes.module';
import { FinanceController } from './finance.controller';
import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cobranca]), TransacoesModule],
  controllers: [FinanceController],
  providers: [FinanceRepository, FinanceService],
})
export class FinanceModule {}
