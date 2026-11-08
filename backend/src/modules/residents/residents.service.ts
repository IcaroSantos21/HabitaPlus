
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Anuncio } from '../../database/entities/anuncio.entity';
import { AnuncioVisualizacao } from '../../database/entities/anuncio-visualizacao.entity';
import { Mensagem } from '../../database/entities/mensagem.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Anuncio)
    private readonly anunciosRepository: Repository<Anuncio>,

    @InjectRepository(AnuncioVisualizacao)
    private readonly visualizacoesRepository: Repository<AnuncioVisualizacao>,

    @InjectRepository(Mensagem)
    private readonly mensagensRepository: Repository<Mensagem>,
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

  private async buscarVisualizacoes(usuarioId: number) {
    const resultados = await this.visualizacoesRepository
      .createQueryBuilder('visualizacao')
      .innerJoin('visualizacao.anuncio', 'anuncio')
      .select('anuncio.categoria', 'categoria')
      .addSelect('COUNT(visualizacao.id)', 'total')
      .where('visualizacao.usuarioId = :usuarioId', { usuarioId })
      .groupBy('anuncio.categoria')
      .getRawMany();

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
      .getRawMany();

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
      .where(
        '(remetente.id = :usuarioId OR destinatario.id = :usuarioId)',
        { usuarioId },
      )
      .getRawMany();

    const conversasUnicas = new Set<string>();
    const totais: Record<string, number> = {};

    for (const mensagem of mensagens) {
      const outroParticipante =
        Number(mensagem.remetenteId) === usuarioId
          ? mensagem.destinatarioId
          : mensagem.remetenteId;

      const chave = `${mensagem.anuncioId}-${outroParticipante}`;

      if (!conversasUnicas.has(chave)) {
        conversasUnicas.add(chave);

        const categoria = mensagem.categoria;
        totais[categoria] = (totais[categoria] ?? 0) + 1;
      }
    }

    return totais;
  }

  private converterResultados(
    resultados: Array<{ categoria: string; total: string }>,
  ): Record<string, number> {
    const totais: Record<string, number> = {};

    for (const resultado of resultados) {
      totais[resultado.categoria] = Number(resultado.total);
    }

    return totais;
  }
}
