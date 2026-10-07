import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PerfilUsuario } from './enums';

@Entity('usuarios')
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