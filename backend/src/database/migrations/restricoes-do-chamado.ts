import { MigrationInterface, QueryRunner } from 'typeorm';

// Garante no banco as regras do chamado
export class RestricoesDoChamado1792700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "chamados"
            ADD CONSTRAINT "CK_chamados_status"
            CHECK ("status" IN ('ABERTO', 'EM_ANDAMENTO', 'ENCERRADO'))
        `);

    // Um chamado pertence a uma unidade OU a uma área comum nunca aos dois.
    await queryRunner.query(`
            ALTER TABLE "chamados"
            ADD CONSTRAINT "CK_chamados_unidade_ou_area"
            CHECK (("unidadeId" IS NULL) <> ("areaComum" IS NULL))
    `);

    // encerradoEm só existe quando o chamado está encerrado.
    await queryRunner.query(`
            ALTER TABLE "chamados"
            ADD CONSTRAINT "CK_chamados_encerrado_em"
            CHECK (("status" = 'ENCERRADO') = ("encerradoEm" IS NOT NULL))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chamados" DROP CONSTRAINT IF EXISTS "CK_chamados_encerrado_em"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chamados" DROP CONSTRAINT IF EXISTS "CK_chamados_unidade_ou_area"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chamados" DROP CONSTRAINT IF EXISTS "CK_chamados_status"`,
    );
  }
}
