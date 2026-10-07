import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';

@Entity('notificacoes')
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

  @Column({ default: false })
  lida!: boolean;

  @Column({ type: 'timestamp' })
  criadaEm!: Date;
}