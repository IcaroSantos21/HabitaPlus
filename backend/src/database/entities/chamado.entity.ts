import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Unidade } from './unidade.entity';
import { StatusChamado } from './enums';

@Entity('chamados')
// Representa um chamado de manutenção ou atendimento aberto por um usuário.
export class Chamado {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @ManyToOne(() => Unidade, { nullable: true })
  @JoinColumn({ name: 'unidadeId' })
  unidade!: Unidade | null;

  @Column({ type: 'varchar', nullable: true })
  areaComum!: string | null;

  @Column()
  categoria!: string;

  @Column({ type: 'varchar', nullable: true })
  equipamento!: string | null;

  @Column('text')
  descricao!: string;

  @Column()
  status!: StatusChamado;

  @Column({ type: 'timestamp' })
  abertoEm!: Date;

  @Column({ type: 'timestamp', nullable: true })
  encerradoEm!: Date | null;
}
