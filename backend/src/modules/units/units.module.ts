import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { Unidade } from '../../database/entities/unidade.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [TypeOrmModule.forFeature([Unidade, Usuario, Vinculo, ContratoLocacao])],
  controllers: [UnitsController],
  providers: [UnitsService],
})
export class UnitsModule {}
