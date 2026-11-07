import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarRefIdEIndiceEmNotificacoes1793990000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notificacoes" ADD "refId" integer`);

    // Acelera a listagem e o contador de não lidas (sempre filtram por usuário).
    await queryRunner.query(`
      CREATE INDEX "IDX_notificacoes_usuario_lida"
      ON "notificacoes" ("usuarioId", "lida")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notificacoes_usuario_lida"`);
    await queryRunner.query(`ALTER TABLE "notificacoes" DROP COLUMN "refId"`);
  }
}