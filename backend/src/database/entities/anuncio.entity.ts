import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { StatusAnuncio } from './enums';

@Entity('anuncios')
// Representa um anúncio de produto publicado por um usuário.
export class Anuncio {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'vendedorId' })
  vendedor!: Usuario;

  @Column()
  titulo!: string;

  @Column('text')
  descricao!: string;

  @Column()
  categoria!: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  preco!: number;

  @Column({
    type: 'enum',
    enum: StatusAnuncio,
  })
  status!: StatusAnuncio;

  @Column({ 
    type: 'varchar',
    nullable: true })
  imagemUrl!: string | null;
}