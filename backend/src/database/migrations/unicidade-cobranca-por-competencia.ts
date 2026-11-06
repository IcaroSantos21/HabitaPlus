import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdicionarUnicidadeDeCobrancaPorCompetencia1793890000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_cobrancas_unidade_competencia"
      ON "cobrancas" ("unidadeId", "competencia")
    `);

    // Toda cobrança paga vira uma receita, e "transacoes" já exige valor > 0.
    await queryRunner.query(`
      ALTER TABLE "cobrancas"
      ADD CONSTRAINT "CHK_cobrancas_valor_positivo"
      CHECK ("valor" > 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cobrancas"
      DROP CONSTRAINT "CHK_cobrancas_valor_positivo"
    `);
    await queryRunner.query(`DROP INDEX "UQ_cobrancas_unidade_competencia"`);
  }
}
