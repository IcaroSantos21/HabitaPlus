import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Anuncio } from '../../database/entities/anuncio.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';
import { AnuncioVisualizacao } from '../../database/entities/anuncio-visualizacao.entity';
import { CategoriaAnuncio, StatusAnuncio } from '../../database/entities/enums';

import { CreateAnuncioDto } from './dto/create-anuncio.dto';
import { UpdateAnuncioDto } from './dto/update-anuncio.dto';
import { UpdateStatusAnuncioDto } from './dto/update-status-anuncio.dto';
import { FilterAnunciosDto } from './dto/filter-anuncios.dto';
import { AuthUserDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class AnunciosService {
  constructor(
    @InjectRepository(Anuncio)
    private readonly anunciosRepository: Repository<Anuncio>,

    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,

    @InjectRepository(Vinculo)
    private readonly vinculosRepository: Repository<Vinculo>,

    @InjectRepository(AnuncioVisualizacao)
    private readonly visualizacoesRepository: Repository<AnuncioVisualizacao>,
  ) {}

  private criarConsulta(): SelectQueryBuilder<Anuncio> {
    return this.anunciosRepository
      .createQueryBuilder('anuncio')
      .leftJoinAndSelect('anuncio.vendedor', 'vendedor');
  }

  async criar(dto: CreateAnuncioDto, usuario: AuthUserDto): Promise<Anuncio> {
    const vendedor = await this.usuariosRepository.findOneBy({
      id: usuario.id,
    });

    if (!vendedor) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const anuncio = this.anunciosRepository.create({
      titulo: dto.titulo.trim(),
      descricao: dto.descricao.trim(),
      categoria: dto.categoria,
      preco: dto.preco,
      imagemUrl: dto.imagemUrl ?? null,
      status: StatusAnuncio.DISPONIVEL,
      vendedor,
    });

    const anuncioSalvo = await this.anunciosRepository.save(anuncio);

    return this.formatarAnuncio(anuncioSalvo);
  }

  async listar(filtros: FilterAnunciosDto) {
    if (
      filtros.precoMin !== undefined &&
      filtros.precoMax !== undefined &&
      filtros.precoMin > filtros.precoMax
    ) {
      throw new BadRequestException(
        'O preço mínimo não pode ser maior que o preço máximo.',
      );
    }

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;

    const consulta = this.criarConsulta();

    this.aplicarFiltros(consulta, filtros);

    const [data, total] = await consulta
      .orderBy('anuncio.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((anuncio) => this.resumoAnuncio(anuncio)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private aplicarFiltros(
    consulta: SelectQueryBuilder<Anuncio>,
    filtros: FilterAnunciosDto,
  ): void {
    if (filtros.categoria) {
      consulta.andWhere('anuncio.categoria = :categoria', {
        categoria: filtros.categoria,
      });
    }

    if (filtros.precoMin !== undefined) {
      consulta.andWhere('anuncio.preco >= :precoMin', {
        precoMin: filtros.precoMin,
      });
    }

    if (filtros.precoMax !== undefined) {
      consulta.andWhere('anuncio.preco <= :precoMax', {
        precoMax: filtros.precoMax,
      });
    }

    if (filtros.status) {
      consulta.andWhere('anuncio.status = :status', {
        status: filtros.status,
      });
    }

    if (filtros.q?.trim()) {
      consulta.andWhere(
        `(
          anuncio.titulo ILIKE :q
          OR anuncio.descricao ILIKE :q
        )`,
        { q: `%${filtros.q.trim()}%` },
      );
    }
  }

  private formatarAnuncio(anuncio: Anuncio) {
    return {
      ...anuncio,
      preco: Number(anuncio.preco),
    };
  }

  categorias(): string[] {
    return Object.values(CategoriaAnuncio);
  }

  async meusAnuncios(usuario: AuthUserDto) {
    const consulta = this.criarConsulta();

    consulta.where('vendedor.id = :usuarioId', {
      usuarioId: usuario.id,
    });

    const anuncios = await consulta.orderBy('anuncio.id', 'DESC').getMany();

    return anuncios.map((anuncio) => this.resumoAnuncio(anuncio));
  }

  async buscarPorId(id: number) {
    const anuncio = await this.criarConsulta()
      .where('anuncio.id = :id', { id })
      .getOne();

    if (!anuncio) {
      throw new NotFoundException('Anúncio não encontrado.');
    }

    const vinculo = await this.vinculosRepository.findOne({
      where: {
        usuario: { id: anuncio.vendedor.id },
      },
      relations: {
        unidade: true,
      },
      order: {
        id: 'ASC',
      },
    });

    return {
      ...this.resumoAnuncio(anuncio),
      vendedor: {
        id: anuncio.vendedor.id,
        nome: anuncio.vendedor.nome,
        unidade: vinculo
          ? {
              bloco: vinculo.unidade.bloco,
              numero: vinculo.unidade.numero,
            }
          : null,
      },
    };
  }

  async atualizar(
    id: number,
    dto: UpdateAnuncioDto,
    usuario: AuthUserDto,
  ): Promise<Anuncio> {
    const anuncio = await this.buscarAnuncioOuFalhar(id);

    this.verificarProprietario(anuncio, usuario);

    if (dto.titulo !== undefined) {
      anuncio.titulo = dto.titulo.trim();
    }

    if (dto.descricao !== undefined) {
      anuncio.descricao = dto.descricao.trim();
    }

    if (dto.preco !== undefined) {
      anuncio.preco = dto.preco;
    }

    if (dto.categoria !== undefined) {
      anuncio.categoria = dto.categoria;
    }

    if (dto.imagemUrl !== undefined) {
      anuncio.imagemUrl = dto.imagemUrl;
    }

    const anuncioAtualizado = await this.anunciosRepository.save(anuncio);

    return this.formatarAnuncio(anuncioAtualizado);
  }

  async atualizarStatus(
    id: number,
    dto: UpdateStatusAnuncioDto,
    usuario: AuthUserDto,
  ): Promise<Anuncio> {
    const anuncio = await this.buscarAnuncioOuFalhar(id);

    this.verificarProprietario(anuncio, usuario);

    anuncio.status = dto.status;

    const anuncioAtualizado = await this.anunciosRepository.save(anuncio);

    return this.formatarAnuncio(anuncioAtualizado);
  }

  async remover(
    id: number,
    usuario: AuthUserDto,
  ): Promise<{ message: string }> {
    const anuncio = await this.buscarAnuncioOuFalhar(id);

    this.verificarProprietario(anuncio, usuario);

    await this.anunciosRepository.remove(anuncio);

    return { message: 'Anúncio removido com sucesso.' };
  }

    
  async registrarVisualizacao(
    anuncioId: number,
    usuario: AuthUserDto,
  ): Promise<{ message: string }> {

    // Verifica se o anúncio existe.
    const anuncio = await this.anunciosRepository.findOne({
      where: { id: anuncioId },
    });

    if (!anuncio) {
      throw new NotFoundException('Anúncio não encontrado.');
    }

    // Obtém a data atual no fuso horário do condomínio.
    const partesData = new Intl.DateTimeFormat('en', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const valores = Object.fromEntries(
      partesData.map((parte) => [parte.type, parte.value]),
    );

    const data = `${valores.year}-${valores.month}-${valores.day}`;

    // Tenta registrar a visualização.
    // A restrição UNIQUE impede duplicações no mesmo dia.
    await this.visualizacoesRepository
      .createQueryBuilder()
      .insert()
      .into(AnuncioVisualizacao)
      .values({
        usuarioId: usuario.id,
        anuncioId,
        data,
      })
      .orIgnore()
      .execute();

    return {
      message: 'Visualização processada com sucesso.',
    };
  }


  private async buscarAnuncioOuFalhar(id: number): Promise<Anuncio> {
    const anuncio = await this.anunciosRepository.findOne({
      where: { id },
      relations: {
        vendedor: true,
      },
    });

    if (!anuncio) {
      throw new NotFoundException('Anúncio não encontrado.');
    }

    return anuncio;
  }

  private verificarProprietario(anuncio: Anuncio, usuario: AuthUserDto): void {
    if (anuncio.vendedor.id !== usuario.id) {
      throw new ForbiddenException(
        'Você não tem permissão para modificar este anúncio.',
      );
    }
  }

  private resumoAnuncio(anuncio: Anuncio) {
    return {
      id: anuncio.id,
      titulo: anuncio.titulo,
      descricao: anuncio.descricao,
      categoria: anuncio.categoria,
      preco: Number(anuncio.preco),
      status: anuncio.status,
      imagemUrl: anuncio.imagemUrl,
      vendedor: {
        id: anuncio.vendedor.id,
        nome: anuncio.vendedor.nome,
      },
    };
  }
}
