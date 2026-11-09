import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

@Entity('comunicados')
export class Comunicado {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  titulo!: string;

  @Column('text')
  conteudo!: string;

  @CreateDateColumn({ type: 'timestamp' })
  criadaEm!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  atualizadaEm!: Date;
}
