import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { ChargesController } from './cobrancas.controller';
import { ChargesOverdueJob } from './cobrancas-overdue.job';
import { ChargesRepository } from './cobrancas.repository';
import { Cobrancas } from './cobrancas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cobranca])],
  controllers: [ChargesController],
  providers: [ChargesRepository, Cobrancas, ChargesOverdueJob],
  exports: [Cobrancas],
})
export class ChargesModule {}
