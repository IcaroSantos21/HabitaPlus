import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarComunicados1794200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "comunicados" (
        "id" SERIAL NOT NULL,
        "titulo" character varying(120) NOT NULL,
        "conteudo" text NOT NULL,
        "criadaEm" timestamp NOT NULL DEFAULT now(),
        "atualizadaEm" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comunicados" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "comunicados"`);
  }
}
