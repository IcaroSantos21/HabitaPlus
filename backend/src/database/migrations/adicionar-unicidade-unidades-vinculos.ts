import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarIntegridadeUnidadesEVinculos1793380000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_unidades_bloco_numero"
      ON "unidades" ("bloco", "numero")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_vinculos_usuario_unidade"
      ON "vinculos" ("usuarioId", "unidadeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_vinculos_usuario_unidade"`);
    await queryRunner.query(`DROP INDEX "UQ_unidades_bloco_numero"`);
  }
}
