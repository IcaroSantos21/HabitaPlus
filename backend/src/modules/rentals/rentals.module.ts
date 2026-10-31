import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { Unidade } from '../../database/entities/unidade.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContratoLocacao, Unidade, Usuario])],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
