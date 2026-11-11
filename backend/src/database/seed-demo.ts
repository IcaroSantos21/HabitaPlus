import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import path from 'path';
import { DataSource, EntityManager } from 'typeorm';
import AppDataSource from './data-source';
import { Anuncio } from './entities/anuncio.entity';
import { AnuncioVisualizacao } from './entities/anuncio-visualizacao.entity';
import { Chamado } from './entities/chamado.entity';
import { Cobranca } from './entities/cobranca.entity';
import { Comunicado } from './entities/comunicado.entity';
import { ContratoLocacao } from './entities/contrato-locacao.entity';
import {
  CategoriaAnuncio,
  PerfilUsuario,
  StatusAnuncio,
  StatusChamado,
  StatusCobranca,
  StatusLocacao,
  TipoTransacao,
  TipoVinculo,
} from './entities/enums';
import { Mensagem } from './entities/mensagem.entity';
import { Notificacao } from './entities/notificacao.entity';
import { Transacao } from './entities/transacao.entity';
import { Unidade } from './entities/unidade.entity';
import { Usuario } from './entities/usuario.entity';
import { Vinculo } from './entities/vinculo.entity';
import { NotificationsDiariasService } from '../modules/notifications/notifications-diarias.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { TipoNotificacao } from '../modules/notifications/enums/tipo-notificacao.enum';
import { CategoriaDespesa } from '../modules/transacoes/enums/categoria-despesa.enum';

const DEMO_EMAIL_DOMAIN = 'demo.habitaplus.local';
const DEMO_BLOCK = 'DEMO';
const DEMO_PASSWORD = 'HabitaDemo2026!';
const RESIDENT_NAMES = [
  'Ana Silva',
  'Bruno Souza',
  'Camila Oliveira',
  'Diego Santos',
  'Eduarda Costa',
  'Felipe Pereira',
  'Gabriela Rodrigues',
  'Henrique Almeida',
  'Isabela Lima',
  'Joao Carvalho',
  'Karen Ferreira',
  'Lucas Gomes',
  'Mariana Ribeiro',
  'Nicolas Martins',
  'Olivia Barbosa',
  'Pedro Rocha',
  'Quezia Dias',
  'Rafael Nunes',
  'Sofia Teixeira',
  'Tiago Moreira',
];
const EXPENSE_CATEGORIES: Record<string, CategoriaDespesa> = {
  agua: CategoriaDespesa.AGUA,
  energia: CategoriaDespesa.ENERGIA,
  limpeza: CategoriaDespesa.LIMPEZA,
  manutencao: CategoriaDespesa.MANUTENCAO,
  salarios: CategoriaDespesa.SALARIOS,
};

interface ExpenseRow {
  month: string;
  category: CategoriaDespesa;
  amount: number;
}

export function parseExpenseDataset(contents: string): ExpenseRow[] {
  const [header, ...lines] = contents.trim().split(/\r?\n/);
  if (header?.trim() !== 'month,categoria,valor') {
    throw new Error(
      'O dataset de despesas deve ter as colunas month,categoria,valor.',
    );
  }

  const rows = lines.filter(Boolean).map((line, index) => {
    const [month, rawCategory, rawAmount] = line.split(',');
    const category = EXPENSE_CATEGORIES[rawCategory];
    const amount = Number(rawAmount);

    if (
      !/^\d{4}-\d{2}$/.test(month) ||
      !category ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(`Linha ${index + 2} inválida no dataset de despesas.`);
    }

    return { month, category, amount };
  });

  if (rows.length === 0) {
    throw new Error('O dataset de despesas está vazio.');
  }
  return rows;
}

function dataNoMes(month: string, day = 1): Date {
  return new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00.000Z`);
}

function mesComDeslocamento(reference: Date, offset: number): string {
  const date = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + offset, 1),
  );
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dataSomandoDias(reference: Date, days: number): Date {
  const date = new Date(reference);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function emailDemo(name: string): string {
  return `${name}@${DEMO_EMAIL_DOMAIN}`;
}

async function limparDadosDemo(manager: EntityManager): Promise<void> {
  const demoUsers = `(SELECT "id" FROM "usuarios" WHERE "email" LIKE '%@${DEMO_EMAIL_DOMAIN}')`;
  const demoUnits = `(SELECT "id" FROM "unidades" WHERE "bloco" = '${DEMO_BLOCK}')`;
  const demoListings = `(SELECT "id" FROM "anuncios" WHERE "vendedorId" IN ${demoUsers})`;

  await manager.query(
    `DELETE FROM "notificacoes"
     WHERE "usuarioId" IN ${demoUsers}
       OR "texto" LIKE 'A cobrança da unidade ${DEMO_BLOCK}/%'
       OR "texto" LIKE 'O contrato de locação da unidade ${DEMO_BLOCK}/%'`,
  );
  await manager.query(
    `DELETE FROM "mensagens"
     WHERE "anuncioId" IN ${demoListings}
        OR "remetenteId" IN ${demoUsers}
        OR "destinatarioId" IN ${demoUsers}`,
  );
  await manager.query(
    `DELETE FROM "anuncio_visualizacoes"
     WHERE "usuarioId" IN ${demoUsers} OR "anuncioId" IN ${demoListings}`,
  );
  await manager.query(
    `DELETE FROM "visualizacoes"
     WHERE "usuarioId" IN ${demoUsers} OR "anuncioId" IN ${demoListings}`,
  );
  await manager.query(
    `DELETE FROM "contratos_locacao"
     WHERE "locatarioId" IN ${demoUsers} OR "unidadeId" IN ${demoUnits}`,
  );
  await manager.query(
    `DELETE FROM "cobrancas" WHERE "unidadeId" IN ${demoUnits}`,
  );
  await manager.query(
    `DELETE FROM "chamados"
     WHERE "usuarioId" IN ${demoUsers} OR "unidadeId" IN ${demoUnits}`,
  );
  await manager.query(
    `DELETE FROM "transacoes" WHERE "usuarioId" IN ${demoUsers}`,
  );
  await manager.query(
    `DELETE FROM "vinculos"
     WHERE "usuarioId" IN ${demoUsers} OR "unidadeId" IN ${demoUnits}`,
  );
  await manager.query(
    `DELETE FROM "anuncios" WHERE "vendedorId" IN ${demoUsers}`,
  );
  await manager.query(`DELETE FROM "unidades" WHERE "bloco" = '${DEMO_BLOCK}'`);
  await manager.query(
    `DELETE FROM "comunicados" WHERE "titulo" LIKE '[DEMO]%'`,
  );
  await manager.query(
    `DELETE FROM "usuarios" WHERE "email" LIKE '%@${DEMO_EMAIL_DOMAIN}'`,
  );
}

async function populateDemoData(
  dataSource: DataSource,
  reference: Date,
): Promise<void> {
  const csvPath = path.resolve(
    __dirname,
    '../../../ml-service/data/expenses.csv',
  );
  const expenseRows = parseExpenseDataset(readFileSync(csvPath, 'utf8'));
  const sourceMonths = [
    ...new Set(expenseRows.map(({ month }) => month)),
  ].sort();
  const monthOffsets = new Map(
    sourceMonths.map((month, index) => [
      month,
      index - sourceMonths.length + 1,
    ]),
  );
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const result = await dataSource.transaction(async (manager) => {
    await limparDadosDemo(manager);

    const usuarioRepository = manager.getRepository(Usuario);
    const admin = usuarioRepository.create({
      nome: 'Administrador Demo',
      email: emailDemo('admin'),
      senhaHash: passwordHash,
      perfil: PerfilUsuario.ADMIN,
    });
    const sindico = usuarioRepository.create({
      nome: 'Sindico Demo',
      email: emailDemo('sindico'),
      senhaHash: passwordHash,
      perfil: PerfilUsuario.SINDICO,
    });
    const moradores = RESIDENT_NAMES.map((nome, index) =>
      usuarioRepository.create({
        nome,
        email: emailDemo(`morador${String(index + 1).padStart(2, '0')}`),
        senhaHash: passwordHash,
        perfil: PerfilUsuario.MORADOR,
      }),
    );
    const usuariosSalvos = await usuarioRepository.save([
      admin,
      sindico,
      ...moradores,
    ]);

    const unidadeRepository = manager.getRepository(Unidade);
    const unidades = await unidadeRepository.save(
      Array.from({ length: 15 }, (_, index) =>
        unidadeRepository.create({
          bloco: DEMO_BLOCK,
          numero: String(101 + index),
          quartos: (index % 3) + 1,
          areaM2: 48 + index * 2,
          valorAluguelSugerido: 1400 + index * 50,
          disponivelLocacao: index >= 5,
        }),
      ),
    );

    const vinculoRepository = manager.getRepository(Vinculo);
    const vinculos = unidades.map((unidade, index) =>
      vinculoRepository.create({
        usuario: moradores[index],
        unidade,
        tipo: TipoVinculo.PROPRIETARIO,
      }),
    );
    for (let index = 0; index < 5; index += 1) {
      vinculos.push(
        vinculoRepository.create({
          usuario: moradores[index + 15],
          unidade: unidades[index],
          tipo: TipoVinculo.INQUILINO,
        }),
      );
    }
    await vinculoRepository.save(vinculos);

    const contratosRepository = manager.getRepository(ContratoLocacao);
    const contratos = await contratosRepository.save(
      unidades.slice(0, 5).map((unidade, index) =>
        contratosRepository.create({
          unidade,
          locatario: moradores[index + 15],
          valorMensal: Number(unidade.valorAluguelSugerido),
          inicio: dataNoMes(mesComDeslocamento(reference, -12)),
          fim: dataSomandoDias(reference, index < 3 ? 10 + index * 7 : 120),
          status: StatusLocacao.ATIVO,
        }),
      ),
    );

    const transacaoRepository = manager.getRepository(Transacao);
    const despesasPorMes = new Map<string, number>();
    const transacoes = expenseRows.map((row) => {
      const month = mesComDeslocamento(
        reference,
        monthOffsets.get(row.month) ?? 0,
      );
      despesasPorMes.set(month, (despesasPorMes.get(month) ?? 0) + row.amount);
      return transacaoRepository.create({
        usuario: sindico,
        tipo: TipoTransacao.DESPESA,
        categoria: row.category,
        valor: row.amount,
        competencia: dataNoMes(month),
        data: dataNoMes(month),
        descricao: `Dataset ML-02: ${row.category}`,
      });
    });
    for (const [month, total] of despesasPorMes) {
      transacoes.push(
        transacaoRepository.create({
          usuario: sindico,
          tipo: TipoTransacao.RECEITA,
          categoria: 'condominio',
          valor: Math.round(total * 1.1 * 100) / 100,
          competencia: dataNoMes(month),
          data: dataNoMes(month),
          descricao: 'Receita mensal demonstrativa do condomínio',
        }),
      );
    }
    await transacaoRepository.save(transacoes, { chunk: 100 });

    const cobrancaRepository = manager.getRepository(Cobranca);
    const cobrancas: Cobranca[] = [];
    for (let offset = -5; offset <= 0; offset += 1) {
      const month = mesComDeslocamento(reference, offset);
      for (const [index, unidade] of unidades.entries()) {
        const dueDate = dataNoMes(month, offset === 0 ? 25 : 10);
        const isOverdueDemo =
          (offset === -1 && index < 4) || (offset === -2 && index === 4);
        const status = isOverdueDemo
          ? StatusCobranca.ATRASADA
          : offset === 0
            ? StatusCobranca.PENDENTE
            : StatusCobranca.PAGA;
        cobrancas.push(
          cobrancaRepository.create({
            unidade,
            competencia: dataNoMes(month),
            valor: 450,
            vencimento: dueDate,
            status,
            stripeSessionId: null,
          }),
        );
      }
    }
    await cobrancaRepository.save(cobrancas, { chunk: 100 });

    const chamadoRepository = manager.getRepository(Chamado);
    const diasDesdeChamado = [75, 50, 25, 4];
    const chamados = Array.from({ length: 4 }, (_, index) =>
      chamadoRepository.create({
        usuario: moradores[index],
        unidade: null,
        areaComum: 'garagem',
        categoria: 'manutencao',
        equipamento: 'elevador',
        descricao: [
          'Elevador parou entre andares.',
          'Ruido anormal durante a subida.',
          'Portas do elevador demorando para fechar.',
          'Falha recorrente no painel do elevador.',
        ][index],
        status: index === 3 ? StatusChamado.ABERTO : StatusChamado.ENCERRADO,
        abertoEm: dataSomandoDias(reference, -diasDesdeChamado[index]),
        encerradoEm:
          index === 3
            ? null
            : dataSomandoDias(reference, -diasDesdeChamado[index] + 1),
      }),
    );
    chamados.push(
      chamadoRepository.create({
        usuario: moradores[4],
        unidade: unidades[4],
        areaComum: null,
        categoria: 'hidraulica',
        equipamento: 'torneira',
        descricao: 'Vazamento na torneira da cozinha.',
        status: StatusChamado.EM_ANDAMENTO,
        abertoEm: dataSomandoDias(reference, -4),
        encerradoEm: null,
      }),
    );
    await chamadoRepository.save(chamados);

    const anuncioRepository = manager.getRepository(Anuncio);
    const categorias = Object.values(CategoriaAnuncio);
    const anuncios = await anuncioRepository.save(
      Array.from({ length: 15 }, (_, index) =>
        anuncioRepository.create({
          vendedor: moradores[index % moradores.length],
          titulo: [
            'Sofa retratil em bom estado',
            'Monitor LED 24 polegadas',
            'Kit de panelas pouco usado',
            'Bicicleta urbana aro 29',
            'Estante para sala',
            'Liquidificador 600W',
            'Mesa de jantar com quatro cadeiras',
            'Fone Bluetooth',
            'Luminarias para quarto',
            'Halteres ajustaveis',
            'Cadeira de escritorio',
            'Micro-ondas compacto',
            'Tapete para sala',
            'Patins adulto',
            'Plantas ornamentais',
          ][index],
          descricao:
            'Item de demonstracao anunciado por morador do condominio.',
          categoria: categorias[index % categorias.length],
          preco: 80 + index * 35,
          status:
            index === 4 || index === 11
              ? StatusAnuncio.VENDIDO
              : StatusAnuncio.DISPONIVEL,
          imagemUrl: null,
        }),
      ),
    );

    const visualizacaoRepository = manager.getRepository(AnuncioVisualizacao);
    const visualizacoes: AnuncioVisualizacao[] = [];
    for (
      let residentIndex = 0;
      residentIndex < moradores.length;
      residentIndex += 1
    ) {
      for (let listingIndex = 0; listingIndex < 6; listingIndex += 1) {
        const anuncio =
          anuncios[(residentIndex + listingIndex) % anuncios.length];
        visualizacoes.push(
          visualizacaoRepository.create({
            usuarioId: moradores[residentIndex].id,
            anuncioId: anuncio.id,
            usuario: moradores[residentIndex],
            anuncio,
            data: dataNoMes(mesComDeslocamento(reference, 0), 1)
              .toISOString()
              .slice(0, 10),
          }),
        );
      }
    }
    await visualizacaoRepository.save(visualizacoes, { chunk: 100 });

    const mensagemRepository = manager.getRepository(Mensagem);
    const mensagens: Mensagem[] = [];
    for (let index = 0; index < 8; index += 1) {
      const vendedor = anuncios[index].vendedor;
      const comprador = moradores[(index + 8) % moradores.length];
      mensagens.push(
        mensagemRepository.create({
          anuncio: anuncios[index],
          remetente: comprador,
          destinatario: vendedor,
          texto: 'O item ainda esta disponivel? Posso combinar a retirada.',
          lida: index % 2 === 0,
          criadaEm: dataSomandoDias(reference, -index - 1),
        }),
        mensagemRepository.create({
          anuncio: anuncios[index],
          remetente: vendedor,
          destinatario: comprador,
          texto: 'Sim, esta disponivel. Podemos combinar pelo chat.',
          lida: false,
          criadaEm: dataSomandoDias(reference, -index),
        }),
      );
    }
    await mensagemRepository.save(mensagens);

    const comunicadoRepository = manager.getRepository(Comunicado);
    const comunicados = await comunicadoRepository.save([
      comunicadoRepository.create({
        titulo: '[DEMO] Manutencao preventiva dos elevadores',
        conteudo:
          'A equipe tecnica realizara uma vistoria preventiva nesta semana.',
      }),
      comunicadoRepository.create({
        titulo: '[DEMO] Assembleia condominial',
        conteudo: 'A assembleia de demonstracao ocorrera no salao de convivio.',
      }),
      comunicadoRepository.create({
        titulo: '[DEMO] Coleta seletiva',
        conteudo: 'Separe os reciclaveis e utilize os coletores identificados.',
      }),
    ]);

    return {
      admin: usuariosSalvos[0],
      sindico: usuariosSalvos[1],
      moradores,
      contratos,
      comunicados,
    };
  });

  const notificationsService = new NotificationsService(
    dataSource.getRepository(Notificacao),
  );
  await notificationsService.notifyMany(
    result.moradores.map(({ id }) => id),
    TipoNotificacao.COMUNICADO,
    `Novo comunicado: ${result.comunicados[0].titulo}`,
    result.comunicados[0].id,
  );

  const dailyNotifications = new NotificationsDiariasService(
    dataSource.getRepository(ContratoLocacao),
    dataSource.getRepository(Cobranca),
    dataSource.getRepository(Chamado),
    dataSource.getRepository(Usuario),
    notificationsService,
  );
  await dailyNotifications.run(reference);

  console.info('Dados demonstrativos criados com sucesso.');
  console.info(`ADMIN: ${emailDemo('admin')} / ${DEMO_PASSWORD}`);
  console.info(`SINDICO: ${emailDemo('sindico')} / ${DEMO_PASSWORD}`);
  console.info(
    `MORADORES: morador01@${DEMO_EMAIL_DOMAIN} a morador20@${DEMO_EMAIL_DOMAIN} / ${DEMO_PASSWORD}`,
  );
}

async function main(): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'O seed de demonstracao nao pode ser executado em producao.',
      );
    }

    await AppDataSource.initialize();
    await populateDemoData(AppDataSource, new Date());
  } catch (error) {
    console.error('Falha ao criar os dados demonstrativos:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  void main();
}
