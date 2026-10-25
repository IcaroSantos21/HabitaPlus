import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chamado } from '../../database/entities/chamado.entity';
import { Unidade } from '../../database/entities/unidade.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';
import { ChamadosController } from './chamados.controller';
import { ChamadosRepository } from './chamados.repository';
import { ChamadosService } from './chamados.service';

@Module({
  imports: [TypeOrmModule.forFeature([Chamado, Vinculo, Unidade])],
  controllers: [ChamadosController],
  providers: [ChamadosService, ChamadosRepository],
  exports: [ChamadosService],
})
export class ChamadosModule {}
