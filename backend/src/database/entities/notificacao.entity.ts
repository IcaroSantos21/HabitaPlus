import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';

@Entity('notificacoes')
@Index('UQ_notificacoes_chave_unica', ['chaveUnica'], { unique: true })
// Representa uma notificação enviada a um usuário.
export class Notificacao {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @Column()
  tipo!: string;

  @Column('text')
  texto!: string;

  @Column({ type: 'integer', nullable: true })
  refId!: number | null;

  @Column({ type: 'varchar', nullable: true })
  chaveUnica!: string | null;

  @Column({ default: false })
  lida!: boolean;

  @Column({ type: 'timestamp' })
  criadaEm!: Date;
}
