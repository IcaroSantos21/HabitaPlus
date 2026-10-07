import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Unidade } from './unidade.entity';

@Entity('chamados')
export class Chamado {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidadeId' })
  unidade!: Unidade;

  @Column({ type: 'varchar', nullable: true })
  areaComum!: string | null;

  @Column()
  categoria!: string;

  @Column({ type: 'varchar', nullable: true })
  equipamento!: string | null;

  @Column('text')
  descricao!: string;

  @Column()
  status!: string;

  @Column({ type: 'timestamp' })
  abertoEm!: Date;

  @Column({ type: 'timestamp', nullable: true })
  encerradoEm!: Date | null;
}