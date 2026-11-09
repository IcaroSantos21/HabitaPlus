import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Anuncio } from '../../database/entities/anuncio.entity';
import { AnuncioVisualizacao } from '../../database/entities/anuncio-visualizacao.entity';
import { Mensagem } from '../../database/entities/mensagem.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { CategoriaAnuncio, StatusAnuncio } from '../../database/entities/enums';
import {
  MlClientService,
  RecommendRequest,
} from '../ml-client/ml-client.service';

interface ResultadoCategoria {
  categoria: string;
  total: string;
}

interface ResultadoMensagem {
  anuncioId: number | string;
  categoria: string;
  remetenteId: number | string;
  destinatarioId: number | string;
}

interface ResultadoCandidato {
  listingId: number | string;
  categoria: string;
  preco: number | string;
  popularidade: number | string;
}

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Anuncio)
    private readonly anunciosRepository: Repository<Anuncio>,

    @InjectRepository(AnuncioVisualizacao)
    private readonly visualizacoesRepository: Repository<AnuncioVisualizacao>,

    @InjectRepository(Mensagem)
    private readonly mensagensRepository: Repository<Mensagem>,

    private readonly mlClientService: MlClientService,
  ) {}

  async obterPerfilDeInteresse(usuario: AuthUserDto) {
    const visualizacoes = await this.buscarVisualizacoes(usuario.id);
    const anunciadas = await this.buscarAnunciosPublicados(usuario.id);
    const conversas = await this.buscarConversas(usuario.id);

    return {
      visualizacoes,
      anunciadas,
      conversas,
    };
  }

  async obterRecomendacoes(usuario: AuthUserDto) {
    // Recupera o histórico de interesse do morador.
    const perfil = await this.obterPerfilDeInteresse(usuario);

    // Recupera os anúncios disponíveis para recomendação.
    const candidatos = await this.buscarCandidatos(usuario.id);

    // Monta o contrato esperado pelo ML-service.
    const payload: RecommendRequest = {
      residentId: usuario.id,

      profile: {
        visualizacoes: this.converterCategoriasParaMinusculas(
          perfil.visualizacoes,
        ),
        anunciadas: this.converterCategoriasParaMinusculas(perfil.anunciadas),
        conversas: this.converterCategoriasParaMinusculas(perfil.conversas),
      },

      candidates: candidatos,

      topN: 5,
    };

    // Envia os dados ao serviço Python.
    const resultado = await this.mlClientService.recommend(payload);

    const ids = resultado.recommendations.map(
      (recomendacao) => recomendacao.listingId,
    );

    if (ids.length === 0) {
      return {
        cluster: resultado.cluster,
        recommendations: [],
      };
    }

    const anuncios = await this.anunciosRepository.find({
      where: {
        id: In(ids),
      },
      relations: {
        vendedor: true,
      },
    });

    const anunciosPorId = new Map(
      anuncios.map((anuncio) => [anuncio.id, anuncio]),
    );

    return {
      cluster: resultado.cluster,

      recommendations: resultado.recommendations
        .map((recomendacao) => {
          const anuncio = anunciosPorId.get(recomendacao.listingId);

          if (!anuncio) {
            return null;
          }

          return {
            listingId: anuncio.id,
            score: recomendacao.score,

            anuncio: {
              titulo: anuncio.titulo,
              descricao: anuncio.descricao,
              categoria: anuncio.categoria,
              preco: Number(anuncio.preco),
              imagemUrl: anuncio.imagemUrl,

              vendedor: {
                nome: anuncio.vendedor.nome,
              },
            },
          };
        })
        .filter((item) => item !== null),
    };
  }

  private converterCategoriasParaMinusculas(
    categorias: Record<string, number>,
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(categorias).map(([categoria, total]) => [
        categoria.toLowerCase(),
        total,
      ]),
    );
  }

  private async buscarVisualizacoes(usuarioId: number) {
    const resultados = await this.visualizacoesRepository
      .createQueryBuilder('visualizacao')
      .innerJoin('visualizacao.anuncio', 'anuncio')
      .select('anuncio.categoria', 'categoria')
      .addSelect('COUNT(visualizacao.id)', 'total')
      .where('visualizacao.usuarioId = :usuarioId', { usuarioId })
      .groupBy('anuncio.categoria')
      .getRawMany<ResultadoCategoria>();

    return this.converterResultados(resultados);
  }

  private async buscarAnunciosPublicados(usuarioId: number) {
    const resultados = await this.anunciosRepository
      .createQueryBuilder('anuncio')
      .innerJoin('anuncio.vendedor', 'vendedor')
      .select('anuncio.categoria', 'categoria')
      .addSelect('COUNT(anuncio.id)', 'total')
      .where('vendedor.id = :usuarioId', { usuarioId })
      .groupBy('anuncio.categoria')
      .getRawMany<ResultadoCategoria>();

    return this.converterResultados(resultados);
  }

  private async buscarConversas(usuarioId: number) {
    const mensagens = await this.mensagensRepository
      .createQueryBuilder('mensagem')
      .innerJoin('mensagem.anuncio', 'anuncio')
      .innerJoin('mensagem.remetente', 'remetente')
      .innerJoin('mensagem.destinatario', 'destinatario')
      .select('anuncio.id', 'anuncioId')
      .addSelect('anuncio.categoria', 'categoria')
      .addSelect('remetente.id', 'remetenteId')
      .addSelect('destinatario.id', 'destinatarioId')
      .where('(remetente.id = :usuarioId OR destinatario.id = :usuarioId)', {
        usuarioId,
      })
      .getRawMany<ResultadoMensagem>();

    const conversasUnicas = new Set<string>();
    const totais: Record<string, number> = {};

    for (const mensagem of mensagens) {
      const remetenteId = Number(mensagem.remetenteId);
      const destinatarioId = Number(mensagem.destinatarioId);

      const outroParticipante =
        remetenteId === usuarioId ? destinatarioId : remetenteId;

      const chave = `${mensagem.anuncioId}-${outroParticipante}`;

      if (!conversasUnicas.has(chave)) {
        conversasUnicas.add(chave);

        const categoria = mensagem.categoria;
        totais[categoria] = (totais[categoria] ?? 0) + 1;
      }
    }

    return totais;
  }

  private async buscarCandidatos(usuarioId: number) {
    const resultados = await this.anunciosRepository
      .createQueryBuilder('anuncio')
      .select('anuncio.id', 'listingId')
      .addSelect('anuncio.categoria', 'categoria')
      .addSelect('anuncio.preco', 'preco')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(visualizacao.id)')
            .from(AnuncioVisualizacao, 'visualizacao')
            .where('visualizacao.anuncioId = anuncio.id'),
        'popularidade',
      )
      .where('anuncio.status = :status', {
        status: StatusAnuncio.DISPONIVEL,
      })
      .andWhere('anuncio.vendedorId != :usuarioId', {
        usuarioId,
      })
      .getRawMany<ResultadoCandidato>();

    return resultados.map((anuncio) => ({
      listingId: Number(anuncio.listingId),
      categoria: anuncio.categoria.toLowerCase() as Lowercase<CategoriaAnuncio>,
      preco: Number(anuncio.preco),
      popularidade: Number(anuncio.popularidade),
    }));
  }

  private converterResultados(
    resultados: ResultadoCategoria[],
  ): Record<string, number> {
    const totais: Record<string, number> = {};

    for (const resultado of resultados) {
      totais[resultado.categoria] = Number(resultado.total);
    }

    return totais;
  }
}
