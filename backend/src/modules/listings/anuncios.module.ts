import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Anuncio } from '../../database/entities/anuncio.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';

import { AnunciosController } from './anuncios.controller';
import { AnunciosService } from './anuncios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Anuncio, Usuario, Vinculo])],
  controllers: [AnunciosController],
  providers: [AnunciosService],
  exports: [AnunciosService],
})
export class AnunciosModule {}
