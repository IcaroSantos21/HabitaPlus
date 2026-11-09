import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaginatedResponseDto,
  paginate,
} from '../../common/dto/paginated-response.dto';
import { Comunicado } from '../../database/entities/comunicado.entity';
import { PerfilUsuario } from '../../database/entities/enums';
import { Usuario } from '../../database/entities/usuario.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TipoNotificacao } from '../notifications/enums/tipo-notificacao.enum';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';
import { ListarComunicadosDto } from './dto/listar-comunicados.dto';
import { UpdateComunicadoDto } from './dto/update-comunicado.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Comunicado)
    private readonly comunicadosRepository: Repository<Comunicado>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async criar(dto: CreateComunicadoDto): Promise<Comunicado> {
    const comunicado = await this.comunicadosRepository.save(
      this.comunicadosRepository.create(dto),
    );
    const moradores = await this.usuariosRepository.find({
      where: { perfil: PerfilUsuario.MORADOR },
      select: { id: true },
    });

    await this.notificationsService.notifyMany(
      moradores.map(({ id }) => id),
      TipoNotificacao.ANUNCIO,
      `Novo comunicado: ${comunicado.titulo}`,
      comunicado.id,
    );

    return comunicado;
  }

  async listar(
    query: ListarComunicadosDto,
  ): Promise<PaginatedResponseDto<Comunicado>> {
    const [comunicados, total] = await this.comunicadosRepository.findAndCount({
      order: { criadaEm: 'DESC', id: 'DESC' },
      skip: (query.pagina - 1) * query.limite,
      take: query.limite,
    });

    return paginate(comunicados, total, query.pagina, query.limite);
  }

  async atualizar(id: number, dto: UpdateComunicadoDto): Promise<Comunicado> {
    const comunicado = await this.buscarOuFalhar(id);
    Object.assign(comunicado, dto);
    return this.comunicadosRepository.save(comunicado);
  }

  async remover(id: number): Promise<void> {
    const comunicado = await this.buscarOuFalhar(id);
    await this.comunicadosRepository.remove(comunicado);
  }

  private async buscarOuFalhar(id: number): Promise<Comunicado> {
    const comunicado = await this.comunicadosRepository.findOne({
      where: { id },
    });
    if (!comunicado) {
      throw new NotFoundException('Comunicado não encontrado.');
    }
    return comunicado;
  }
}
