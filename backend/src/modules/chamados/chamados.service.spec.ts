import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Chamado } from '../../database/entities/chamado.entity';
import { PerfilUsuario, StatusChamado } from '../../database/entities/enums';
import { Unidade } from '../../database/entities/unidade.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import { ChamadosRepository } from './chamados.repository';
import { ChamadosService } from './chamados.service';

const morador: AuthUserDto = {
  id: 1,
  nome: 'Maria',
  email: 'maria@example.com',
  perfil: PerfilUsuario.MORADOR,
};
const sindico: AuthUserDto = {
  id: 2,
  nome: 'Sérgio',
  email: 'sergio@example.com',
  perfil: PerfilUsuario.SINDICO,
};

function criarChamado(overrides: Partial<Chamado> = {}): Chamado {
  return {
    id: 10,
    usuario: { id: 1, nome: 'Maria' } as Usuario,
    unidade: { id: 5, bloco: 'B', numero: '302' } as Unidade,
    areaComum: null,
    categoria: 'eletrica',
    equipamento: 'elevador',
    descricao: 'Parando entre os andares',
    status: StatusChamado.ABERTO,
    abertoEm: new Date('2026-10-01T10:00:00Z'),
    encerradoEm: null,
    ...overrides,
  };
}

describe('ChamadosService', () => {
  const chamadosRepository = {
    createAndLoad: jest.fn(),
    findPaginated: jest.fn(),
    findOneWithRelations: jest.fn(),
    updateStatusIfCurrent: jest.fn(),
    countByEquipmentAndMonth: jest.fn(),
  };
  const vinculosRepository = { exists: jest.fn() };
  const unidadesRepository = { exists: jest.fn() };

  const service = new ChamadosService(
    chamadosRepository as unknown as ChamadosRepository,
    vinculosRepository as unknown as Repository<Vinculo>,
    unidadesRepository as unknown as Repository<Unidade>,
  );

  const entrada: CriarChamadoDto = {
    unidadeId: 5,
    categoria: 'Elétrica',
    equipamento: 'Elevador',
    descricao: 'Parando entre os andares',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    chamadosRepository.createAndLoad.mockResolvedValue(criarChamado());
    chamadosRepository.findPaginated.mockResolvedValue({ items: [], total: 0 });
  });

  afterEach(() => jest.useRealTimers());

  describe('abertura', () => {
    it('deve abrir chamado ABERTO para morador vinculado à unidade', async () => {
      vinculosRepository.exists.mockResolvedValue(true);
      jest.useFakeTimers().setSystemTime(new Date('2026-10-22T12:00:00Z'));

      const resposta = await service.create(entrada, morador);

      expect(chamadosRepository.createAndLoad).toHaveBeenCalledWith({
        usuarioId: 1,
        unidadeId: 5,
        areaComum: null,
        categoria: 'eletrica',
        equipamento: 'elevador',
        descricao: 'Parando entre os andares',
        status: StatusChamado.ABERTO,
        abertoEm: new Date('2026-10-22T12:00:00Z'),
      });
      expect(resposta.status).toBe(StatusChamado.ABERTO);
      expect(resposta.usuario).toEqual({ id: 1, nome: 'Maria' });
    });

    it('deve abrir chamado de área comum sem consultar vínculo', async () => {
      await service.create(
        { ...entrada, unidadeId: undefined, areaComum: 'Salão de Festas' },
        morador,
      );

      expect(vinculosRepository.exists).not.toHaveBeenCalled();
      expect(chamadosRepository.createAndLoad).toHaveBeenCalledWith(
        expect.objectContaining({
          unidadeId: null,
          areaComum: 'salao_de_festas',
        }),
      );
    });

    it('deve exigir unidade ou área comum', async () => {
      await expect(
        service.create({ ...entrada, unidadeId: undefined }, morador),
      ).rejects.toThrow('Informe a unidade ou a área comum do chamado.');
    });

    it('deve impedir informar unidade e área comum ao mesmo tempo', async () => {
      await expect(
        service.create({ ...entrada, areaComum: 'Piscina' }, morador),
      ).rejects.toThrow(BadRequestException);
      expect(chamadosRepository.createAndLoad).not.toHaveBeenCalled();
    });

    it('deve impedir morador de abrir chamado em unidade sem vínculo', async () => {
      vinculosRepository.exists.mockResolvedValue(false);

      await expect(service.create(entrada, morador)).rejects.toThrow(
        ForbiddenException,
      );
      expect(chamadosRepository.createAndLoad).not.toHaveBeenCalled();
    });

    it('deve permitir ao síndico abrir chamado em qualquer unidade existente', async () => {
      unidadesRepository.exists.mockResolvedValue(true);

      await service.create(entrada, sindico);

      expect(vinculosRepository.exists).not.toHaveBeenCalled();
      expect(chamadosRepository.createAndLoad).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 2 }),
      );
    });

    it('deve retornar 404 quando o síndico informa unidade inexistente', async () => {
      unidadesRepository.exists.mockResolvedValue(false);

      await expect(service.create(entrada, sindico)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve rejeitar categoria sem letras ou números', async () => {
      await expect(
        service.create({ ...entrada, categoria: '!!!' }, sindico),
      ).rejects.toThrow('O campo "categoria" deve conter letras ou números.');
    });
  });

  describe('listagem', () => {
    it('deve restringir o morador aos próprios chamados', async () => {
      await service.buscaTodos({ pagina: 1, limite: 20 }, morador);

      expect(chamadosRepository.findPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 1 }),
      );
    });

    it('deve listar todos os chamados para síndico e admin', async () => {
      await service.buscaTodos({ pagina: 1, limite: 20 }, sindico);
      await service.buscaTodos(
        { pagina: 1, limite: 20 },
        { ...sindico, perfil: PerfilUsuario.ADMIN },
      );

      for (const [filtro] of chamadosRepository.findPaginated.mock
        .calls as Array<[{ usuarioId?: number }]>) {
        expect(filtro.usuarioId).toBeUndefined();
      }
    });

    it('deve normalizar filtros e montar a paginação', async () => {
      chamadosRepository.findPaginated.mockResolvedValue({
        items: [criarChamado()],
        total: 41,
      });

      const resposta = await service.buscaTodos(
        {
          pagina: 2,
          limite: 20,
          status: StatusChamado.ABERTO,
          categoria: 'Elétrica',
          equipamento: 'Elevador',
        },
        sindico,
      );

      expect(chamadosRepository.findPaginated).toHaveBeenCalledWith({
        usuarioId: undefined,
        status: StatusChamado.ABERTO,
        categoria: 'eletrica',
        equipamento: 'elevador',
        pagina: 2,
        limite: 20,
      });
      expect(resposta.meta).toEqual({
        pagina: 2,
        limite: 20,
        total: 41,
        totalPaginas: 3,
      });
      expect(resposta.data).toHaveLength(1);
    });
  });

  describe('mudança de status', () => {
    it('deve mover ABERTO para EM_ANDAMENTO sem preencher encerradoEm', async () => {
      chamadosRepository.findOneWithRelations.mockResolvedValue(criarChamado());
      chamadosRepository.updateStatusIfCurrent.mockResolvedValue(true);

      const resposta = await service.atualizarStatus(10, {
        status: StatusChamado.EM_ANDAMENTO,
      });

      expect(chamadosRepository.updateStatusIfCurrent).toHaveBeenCalledWith(
        10,
        StatusChamado.ABERTO,
        StatusChamado.EM_ANDAMENTO,
        null,
      );
      expect(resposta.status).toBe(StatusChamado.EM_ANDAMENTO);
      expect(resposta.encerradoEm).toBeNull();
    });

    it('deve preencher encerradoEm ao encerrar', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-22T15:30:00Z'));
      chamadosRepository.findOneWithRelations.mockResolvedValue(
        criarChamado({ status: StatusChamado.EM_ANDAMENTO }),
      );
      chamadosRepository.updateStatusIfCurrent.mockResolvedValue(true);

      const resposta = await service.atualizarStatus(10, {
        status: StatusChamado.ENCERRADO,
      });

      expect(resposta.status).toBe(StatusChamado.ENCERRADO);
      expect(resposta.encerradoEm).toEqual(new Date('2026-10-22T15:30:00Z'));
    });

    it('deve bloquear transição inválida com 400 e não gravar nada', async () => {
      chamadosRepository.findOneWithRelations.mockResolvedValue(criarChamado());

      await expect(
        service.atualizarStatus(10, { status: StatusChamado.ENCERRADO }),
      ).rejects.toThrow(BadRequestException);
      expect(chamadosRepository.updateStatusIfCurrent).not.toHaveBeenCalled();
    });

    it('deve impedir reabrir chamado encerrado', async () => {
      chamadosRepository.findOneWithRelations.mockResolvedValue(
        criarChamado({
          status: StatusChamado.ENCERRADO,
          encerradoEm: new Date(),
        }),
      );

      await expect(
        service.atualizarStatus(10, { status: StatusChamado.ABERTO }),
      ).rejects.toThrow('O chamado já foi encerrado');
    });

    it('deve retornar 404 quando o chamado não existe', async () => {
      chamadosRepository.findOneWithRelations.mockResolvedValue(null);

      await expect(
        service.atualizarStatus(99, { status: StatusChamado.EM_ANDAMENTO }),
      ).rejects.toThrow('Chamado não encontrado');
    });

    it('deve retornar 409 quando outro PATCH alterou o chamado antes', async () => {
      chamadosRepository.findOneWithRelations.mockResolvedValue(criarChamado());
      chamadosRepository.updateStatusIfCurrent.mockResolvedValue(false);

      await expect(
        service.atualizarStatus(10, { status: StatusChamado.EM_ANDAMENTO }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('histórico', () => {
    it('deve exigir equipamento ou área', async () => {
      await expect(
        service.buscarHistorico({ pagina: 1, limite: 20 }),
      ).rejects.toThrow('Informe ao menos um filtro: equipamento ou area.');
    });

    it('deve filtrar pelo equipamento e pela área normalizados', async () => {
      await service.buscarHistorico({
        pagina: 1,
        limite: 20,
        equipamento: 'Elevador',
        area: 'Hall do Bloco B',
      });

      expect(chamadosRepository.findPaginated).toHaveBeenCalledWith({
        equipamento: 'elevador',
        areaComum: 'hall_do_bloco_b',
        pagina: 1,
        limite: 20,
      });
    });
  });

  describe('estatísticas', () => {
    it('deve somar o total por equipamento e manter a série por mês', async () => {
      const linhas = [
        { mes: '2026-09', equipamento: 'elevador', total: 5 },
        { mes: '2026-09', equipamento: 'portao', total: 2 },
        { mes: '2026-10', equipamento: 'elevador', total: 4 },
      ];
      chamadosRepository.countByEquipmentAndMonth.mockResolvedValue(linhas);

      await expect(service.getStatus()).resolves.toEqual({
        porEquipamento: [
          { equipamento: 'elevador', total: 9 },
          { equipamento: 'portao', total: 2 },
        ],
        porEquipamentoEMes: linhas,
      });
    });
  });
});
