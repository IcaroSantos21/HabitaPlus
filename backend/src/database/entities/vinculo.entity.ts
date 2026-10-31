import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Unidade } from './unidade.entity';
import { TipoVinculo } from './enums';

@Entity('vinculos')
@Index('UQ_vinculos_usuario_unidade', ['usuario', 'unidade'], { unique: true })
// Relaciona um usuário a uma unidade como proprietário ou inquilino.
export class Vinculo {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidadeId' })
  unidade!: Unidade;

  @Column({
    type: 'enum',
    enum: TipoVinculo,
  })
  tipo!: TipoVinculo;
}
