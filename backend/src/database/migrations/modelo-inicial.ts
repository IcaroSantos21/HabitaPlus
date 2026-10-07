import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarModeloInicial1791246819778 implements MigrationInterface {
  // Cria os tipos, tabelas e relacionamentos iniciais do banco de dados.
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==========================================
    // ENUMS
    // ==========================================
    // Cria valores fixos usados para perfis, vínculos, transações e status.

    await queryRunner.query(`
      CREATE TYPE "perfil_usuario_enum"
      AS ENUM ('MORADOR', 'SINDICO', 'ADMIN')
    `);

    await queryRunner.query(`
      CREATE TYPE "tipo_vinculo_enum"
      AS ENUM ('PROPRIETARIO', 'INQUILINO')
    `);

    await queryRunner.query(`
      CREATE TYPE "tipo_transacao_enum"
      AS ENUM ('RECEITA', 'DESPESA')
    `);

    await queryRunner.query(`
      CREATE TYPE "status_cobranca_enum"
      AS ENUM ('PENDENTE', 'PAGA', 'ATRASADA')
    `);

    await queryRunner.query(`
      CREATE TYPE "status_anuncio_enum"
      AS ENUM ('DISPONIVEL', 'VENDIDO')
    `);

    // ==========================================
    // TABELAS
    // ==========================================
    // Cria as tabelas usadas por usuários, condomínio, finanças e marketplace.
    // ==========================================
    // USUARIOS
    // ==========================================

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" SERIAL NOT NULL,
        "nome" character varying NOT NULL,
        "email" character varying NOT NULL,
        "senhaHash" character varying NOT NULL,
        "perfil" "perfil_usuario_enum" NOT NULL,
        CONSTRAINT "PK_usuarios" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_usuarios_email" UNIQUE ("email")
      )
    `);

    // ==========================================
    // UNIDADES
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "unidades" (
        "id" SERIAL NOT NULL,
        "bloco" character varying NOT NULL,
        "numero" character varying NOT NULL,
        "quartos" integer NOT NULL,
        "areaM2" numeric(10,2) NOT NULL,
        "valorAluguelSugerido" numeric(10,2) NOT NULL,
        "disponivelLocacao" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_unidades" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // VINCULOS
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "vinculos" (
        "id" SERIAL NOT NULL,
        "usuarioId" integer NOT NULL,
        "unidadeId" integer NOT NULL,
        "tipo" "tipo_vinculo_enum" NOT NULL,
        CONSTRAINT "PK_vinculos" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // CONTRATOS DE LOCACAO
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "contratos_locacao" (
        "id" SERIAL NOT NULL,
        "unidadeId" integer NOT NULL,
        "locatarioId" integer NOT NULL,
        "valorMensal" numeric(10,2) NOT NULL,
        "inicio" date NOT NULL,
        "fim" date,
        "status" character varying NOT NULL,
        CONSTRAINT "PK_contratos_locacao" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // CHAMADOS
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "chamados" (
        "id" SERIAL NOT NULL,
        "usuarioId" integer NOT NULL,
        "unidadeId" integer NOT NULL,
        "areaComum" character varying,
        "categoria" character varying NOT NULL,
        "equipamento" character varying,
        "descricao" text NOT NULL,
        "status" character varying NOT NULL,
        "abertoEm" timestamp NOT NULL,
        "encerradoEm" timestamp,
        CONSTRAINT "PK_chamados" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // TRANSACOES
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "transacoes" (
        "id" SERIAL NOT NULL,
        "usuarioId" integer NOT NULL,
        "tipo" "tipo_transacao_enum" NOT NULL,
        "categoria" character varying NOT NULL,
        "valor" numeric(10,2) NOT NULL,
        "competencia" date NOT NULL,
        "dados" jsonb,
        "descricao" text,
        CONSTRAINT "PK_transacoes" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // COBRANCAS
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "cobrancas" (
        "id" SERIAL NOT NULL,
        "unidadeId" integer NOT NULL,
        "competencia" date NOT NULL,
        "valor" numeric(10,2) NOT NULL,
        "vencimento" date NOT NULL,
        "status" "status_cobranca_enum" NOT NULL,
        "stripeSessionId" character varying,
        CONSTRAINT "PK_cobrancas" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // ANUNCIOS
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "anuncios" (
        "id" SERIAL NOT NULL,
        "vendedorId" integer NOT NULL,
        "titulo" character varying NOT NULL,
        "descricao" text NOT NULL,
        "categoria" character varying NOT NULL,
        "preco" numeric(10,2) NOT NULL,
        "status" "status_anuncio_enum" NOT NULL,
        "imagemUrl" character varying,
        CONSTRAINT "PK_anuncios" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // VISUALIZACOES
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "visualizacoes" (
        "id" SERIAL NOT NULL,
        "usuarioId" integer NOT NULL,
        "anuncioId" integer NOT NULL,
        "dados" timestamp NOT NULL,
        CONSTRAINT "PK_visualizacoes" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // MENSAGENS
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "mensagens" (
        "id" SERIAL NOT NULL,
        "anuncioId" integer NOT NULL,
        "remetenteId" integer NOT NULL,
        "destinatarioId" integer NOT NULL,
        "texto" text NOT NULL,
        "lida" boolean NOT NULL DEFAULT false,
        "criadaEm" timestamp NOT NULL,
        CONSTRAINT "PK_mensagens" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // NOTIFICACOES
    // ==========================================
    await queryRunner.query(`
      CREATE TABLE "notificacoes" (
        "id" SERIAL NOT NULL,
        "usuarioId" integer NOT NULL,
        "tipo" character varying NOT NULL,
        "texto" text NOT NULL,
        "lida" boolean NOT NULL DEFAULT false,
        "criadaEm" timestamp NOT NULL,
        CONSTRAINT "PK_notificacoes" PRIMARY KEY ("id")
      )
    `);

    // ==========================================
    // CHAVES ESTRANGEIRAS
    // ==========================================
    // Liga os registros às tabelas relacionadas e define suas regras de exclusão.

    await queryRunner.query(`
      ALTER TABLE "vinculos"
      ADD CONSTRAINT "FK_vinculos_usuario"
      FOREIGN KEY ("usuarioId")
      REFERENCES "usuarios"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "vinculos"
      ADD CONSTRAINT "FK_vinculos_unidade"
      FOREIGN KEY ("unidadeId")
      REFERENCES "unidades"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "contratos_locacao"
      ADD CONSTRAINT "FK_contratos_unidade"
      FOREIGN KEY ("unidadeId")
      REFERENCES "unidades"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "contratos_locacao"
      ADD CONSTRAINT "FK_contratos_locatario"
      FOREIGN KEY ("locatarioId")
      REFERENCES "usuarios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "chamados"
      ADD CONSTRAINT "FK_chamados_usuario"
      FOREIGN KEY ("usuarioId")
      REFERENCES "usuarios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "chamados"
      ADD CONSTRAINT "FK_chamados_unidade"
      FOREIGN KEY ("unidadeId")
      REFERENCES "unidades"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "transacoes"
      ADD CONSTRAINT "FK_transacoes_usuario"
      FOREIGN KEY ("usuarioId")
      REFERENCES "usuarios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "cobrancas"
      ADD CONSTRAINT "FK_cobrancas_unidade"
      FOREIGN KEY ("unidadeId")
      REFERENCES "unidades"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "anuncios"
      ADD CONSTRAINT "FK_anuncios_vendedor"
      FOREIGN KEY ("vendedorId")
      REFERENCES "usuarios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "visualizacoes"
      ADD CONSTRAINT "FK_visualizacoes_usuario"
      FOREIGN KEY ("usuarioId")
      REFERENCES "usuarios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "visualizacoes"
      ADD CONSTRAINT "FK_visualizacoes_anuncio"
      FOREIGN KEY ("anuncioId")
      REFERENCES "anuncios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "mensagens"
      ADD CONSTRAINT "FK_mensagens_anuncio"
      FOREIGN KEY ("anuncioId")
      REFERENCES "anuncios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "mensagens"
      ADD CONSTRAINT "FK_mensagens_remetente"
      FOREIGN KEY ("remetenteId")
      REFERENCES "usuarios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "mensagens"
      ADD CONSTRAINT "FK_mensagens_destinatario"
      FOREIGN KEY ("destinatarioId")
      REFERENCES "usuarios"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "notificacoes"
      ADD CONSTRAINT "FK_notificacoes_usuario"
      FOREIGN KEY ("usuarioId")
      REFERENCES "usuarios"("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Desfaz a criação na ordem inversa, removendo primeiro as tabelas dependentes.
    // Primeiro removemos as tabelas.
    await queryRunner.query(`DROP TABLE "notificacoes"`);
    await queryRunner.query(`DROP TABLE "mensagens"`);
    await queryRunner.query(`DROP TABLE "visualizacoes"`);
    await queryRunner.query(`DROP TABLE "anuncios"`);
    await queryRunner.query(`DROP TABLE "cobrancas"`);
    await queryRunner.query(`DROP TABLE "transacoes"`);
    await queryRunner.query(`DROP TABLE "chamados"`);
    await queryRunner.query(`DROP TABLE "contratos_locacao"`);
    await queryRunner.query(`DROP TABLE "vinculos"`);
    await queryRunner.query(`DROP TABLE "unidades"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);

    // Depois removemos os ENUMs.
    await queryRunner.query(`DROP TYPE "status_anuncio_enum"`);
    await queryRunner.query(`DROP TYPE "status_cobranca_enum"`);
    await queryRunner.query(`DROP TYPE "tipo_transacao_enum"`);
    await queryRunner.query(`DROP TYPE "tipo_vinculo_enum"`);
    await queryRunner.query(`DROP TYPE "perfil_usuario_enum"`);
  }
}