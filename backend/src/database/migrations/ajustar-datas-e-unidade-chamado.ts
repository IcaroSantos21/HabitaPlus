import { MigrationInterface, QueryRunner } from 'typeorm';

export class AjustarDatasEUnidadeChamado1792290000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chamados"
      ALTER COLUMN "unidadeId" DROP NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'transacoes'
            AND column_name = 'data'
        ) THEN
          ALTER TABLE "transacoes" ADD COLUMN "data" date;
          UPDATE "transacoes" SET "data" = "competencia" WHERE "data" IS NULL;
          ALTER TABLE "transacoes" ALTER COLUMN "data" SET NOT NULL;
        END IF;
      END;
      $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'visualizacoes'
            AND column_name = 'dados'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'visualizacoes'
            AND column_name = 'data'
        ) THEN
          ALTER TABLE "visualizacoes" RENAME COLUMN "dados" TO "data";
        END IF;
      END;
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'transacoes'
            AND column_name = 'dados'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'visualizacoes'
              AND column_name = 'data'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'visualizacoes'
              AND column_name = 'dados'
          ) THEN
            ALTER TABLE "visualizacoes" RENAME COLUMN "data" TO "dados";
          END IF;

          ALTER TABLE "transacoes" DROP COLUMN IF EXISTS "data";
          ALTER TABLE "chamados" ALTER COLUMN "unidadeId" SET NOT NULL;
        END IF;
      END;
      $$
    `);
  }
}
