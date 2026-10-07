import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Unidade } from './unidade.entity';
import { StatusCobranca } from './enums';

@Entity('cobrancas')
// Representa uma cobrança vinculada a uma unidade do condomínio.
export class Cobranca {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidadeId' })
  unidade!: Unidade;

  @Column({ type: 'date' })
  competencia!: Date;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  valor!: number;

  @Column({ type: 'date' })
  vencimento!: Date;

  @Column({
    type: 'enum',
    enum: StatusCobranca,
  })
  status!: StatusCobranca;

  @Column({ type: 'varchar', nullable: true })
  stripeSessionId!: string | null;
}