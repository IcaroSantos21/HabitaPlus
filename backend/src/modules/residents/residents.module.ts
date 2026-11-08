import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Anuncio } from '../../database/entities/anuncio.entity';
import { AnuncioVisualizacao } from '../../database/entities/anuncio-visualizacao.entity';
import { Mensagem } from '../../database/entities/mensagem.entity';

import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Anuncio,
      AnuncioVisualizacao,
      Mensagem,
    ]),
  ],
  controllers: [ResidentsController],
  providers: [ResidentsService],
})
export class ResidentsModule {}