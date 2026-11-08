import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestringirValoresDeTransacao1792300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transacoes"
            ALTER COLUMN "valor" TYPE numeric(12,2)
        `);

    await queryRunner.query(`
            ALTER TABLE "transacoes"
            ADD CONSTRAINT "CHK_transacoes_valor_positivo"
            CHECK ("valor" > 0)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transacoes"
            DROP CONSTRAINT "CHK_transacoes_valor_positivos"
        `);
    await queryRunner.query(`
            ALTER TABLE "transacoes"
            ALTER COLUMN "valor" TYPE numeric(10,2)    
        `);
  }
}
