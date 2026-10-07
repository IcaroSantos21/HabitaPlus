import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('unidades')
// Representa uma unidade habitacional do condomínio e seus dados básicos.
export class Unidade {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  bloco!: string;

  @Column()
  numero!: string;

  @Column()
  quartos!: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  areaM2!: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  valorAluguelSugerido!: number;

  @Column({ default: true })
  disponivelLocacao!: boolean;
}