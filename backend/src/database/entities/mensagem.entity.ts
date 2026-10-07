import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Anuncio } from './anuncio.entity';

@Entity('mensagens')
export class Mensagem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Anuncio)
  @JoinColumn({ name: 'anuncioId' })
  anuncio!: Anuncio;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'remetenteId' })
  remetente!: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'destinatarioId' })
  destinatario!: Usuario;

  @Column('text')
  texto!: string;

  @Column({ default: false })
  lida!: boolean;

  @Column({ type: 'timestamp' })
  criadaEm!: Date;
}