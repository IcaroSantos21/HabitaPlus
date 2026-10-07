import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Unidade } from './unidade.entity';

@Entity('contratos_locacao')
// Representa o contrato de aluguel de uma unidade por um morador.
export class ContratoLocacao {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidadeId' })
  unidade!: Unidade;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'locatarioId' })
  locatario!: Usuario;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  valorMensal!: number;

  @Column({ type: 'date' })
  inicio!: Date;

  @Column({ type: 'date', nullable: true })
  fim!: Date | null;

  @Column()
  status!: string;
}