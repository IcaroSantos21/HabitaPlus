import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { TipoTransacao } from './enums';

@Entity('transacoes')
export class Transacao {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @Column({
    type: 'enum',
    enum: TipoTransacao,
  })
  tipo!: TipoTransacao;

  @Column()
  categoria!: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  valor!: number;

  @Column({ type: 'date' })
  competencia!: Date;

  @Column({ type: 'jsonb', nullable: true })
  dados!: object | null;

  @Column('text', { nullable: true })
  descricao!: string | null;
}