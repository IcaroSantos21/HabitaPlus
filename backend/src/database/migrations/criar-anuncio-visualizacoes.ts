
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarAnuncioVisualizacoes1794092640000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "anuncio_visualizacoes" (
        "id" SERIAL NOT NULL,
        "usuarioId" integer NOT NULL,
        "anuncioId" integer NOT NULL,
        "data" date NOT NULL,
        CONSTRAINT "PK_anuncio_visualizacoes"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_visualizacoes_usuario"
          FOREIGN KEY ("usuarioId")
          REFERENCES "usuarios"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_visualizacoes_anuncio"
          FOREIGN KEY ("anuncioId")
          REFERENCES "anuncios"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX
      "UQ_anuncio_visualizacoes_usuario_anuncio_data"
      ON "anuncio_visualizacoes"
      ("usuarioId", "anuncioId", "data")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "anuncio_visualizacoes"
    `);
  }
}
