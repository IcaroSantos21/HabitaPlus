import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { TipoTransacao } from './enums';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('transacoes')
// Representa uma receita ou despesa registrada por um usuário.
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
    precision: 12,
    scale: 2,
    transformer: DecimalTransformer,
  })
  valor!: number;

  @Column({ type: 'date' })
  competencia!: Date;

  @Column({ type: 'date' })
  data!: Date;

  @Column('text', { nullable: true })
  descricao!: string | null;
}
