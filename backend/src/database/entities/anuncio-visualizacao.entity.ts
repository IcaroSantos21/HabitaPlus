import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Anuncio } from './anuncio.entity';

@Entity('anuncio_visualizacoes')
@Index(
  'UQ_anuncio_visualizacoes_usuario_anuncio_data',
  ['usuarioId', 'anuncioId', 'data'],
  { unique: true },
)
export class AnuncioVisualizacao {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  usuarioId!: number;

  @Column()
  anuncioId!: number;

  @Column({ type: 'date' })
  data!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @ManyToOne(() => Anuncio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'anuncioId' })
  anuncio!: Anuncio;
}
