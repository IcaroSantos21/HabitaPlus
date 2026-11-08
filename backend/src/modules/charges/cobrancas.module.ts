import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { ChargesController } from './cobrancas.controller';
import { CobrancasAtrasadasJob } from './cobrancas-atrasadas.job';
import { CobrancasRepository } from './cobrancas.repository';
import { CobrancasService } from './cobrancas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cobranca])],
  controllers: [ChargesController],
  providers: [CobrancasRepository, CobrancasService, CobrancasAtrasadasJob],
  exports: [CobrancasService],
})
export class CobrancasModule {}
