import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Anuncio } from './anuncio.entity';

@Entity('visualizacoes')
export class Visualizacao {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @ManyToOne(() => Anuncio)
  @JoinColumn({ name: 'anuncioId' })
  anuncio!: Anuncio;

  @Column({ type: 'timestamp' })
  dados!: Date;
}