import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PerfilUsuario } from './enums';

@Entity('usuarios')
// Representa uma pessoa cadastrada no sistema e seu perfil de acesso.
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nome!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  senhaHash!: string;

  @Column({
    type: 'enum',
    enum: PerfilUsuario,
  })
  perfil!: PerfilUsuario;
}