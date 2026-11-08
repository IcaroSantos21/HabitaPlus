import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarChaveUnicaEmNotificacoes1794100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notificacoes" ADD "chaveUnica" character varying`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_notificacoes_chave_unica"
      ON "notificacoes" ("chaveUnica")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_notificacoes_chave_unica"`);
    await queryRunner.query(
      `ALTER TABLE "notificacoes" DROP COLUMN "chaveUnica"`,
    );
  }
}
