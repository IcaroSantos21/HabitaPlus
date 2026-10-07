import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Unidade } from './unidade.entity';
import { TipoVinculo } from './enums';

@Entity('vinculos')
export class Vinculo {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidadeId' })
  unidade!: Unidade;

  @Column({
    type: 'enum',
    enum: TipoVinculo,
  })
  tipo!: TipoVinculo;
}