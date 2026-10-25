import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { StatusChamado } from './enums';

import { Usuario } from './usuario.entity';
import { Unidade } from './unidade.entity';

@Entity('chamados')
@Check(
  'CK_chamados_status',
  `"status" IN ('ABERTO', 'EM_ANDAMENTO', 'ENCERRADO')`,
)
@Check(
  'CK_chamados_unidade_ou_area',
  `("unidadeId" IS NULL) <> ("areaComum" IS NULL)`,
)
@Check(
  'CK_chamados_encerrados_em',
  `("status" = 'ENCERRADO') = ("encerradoEm) IS NOT NULL`,
)
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

  @Column({ type: 'varchar' })
  status!: StatusChamado;

  @Column({ type: 'timestamp' })
  abertoEm!: Date;

  @Column({ type: 'timestamp', nullable: true })
  encerradoEm!: Date | null;
}
