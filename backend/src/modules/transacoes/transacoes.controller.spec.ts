import { PerfilUsuario, TipoTransacao } from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { CriarTransacaoDto } from './dto/criar-transacao.dto';
import { TransacoesController } from './transacoes.controller';
import { TransacoesService } from './transacoes.service';

describe('TransacoesController', () => {
  it('deve encaminhar o id do usuário autenticado ao service', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 1 });
    const service = {
      create: createMock,
    } as unknown as TransacoesService;
    const controller = new TransacoesController(service);
    const input = {
      tipo: TipoTransacao.RECEITA,
      categoria: 'taxa condominial',
      valor: 500,
      competencia: '2026-10',
      data: '2026-10-10',
    } as CriarTransacaoDto;
    const user = {
      id: 42,
      nome: 'Síndica',
      email: 'sindica@example.com',
      perfil: PerfilUsuario.SINDICO,
    } as AuthUserDto;

    await controller.create(input, user);
    expect(createMock).toHaveBeenCalledWith(input, 42);
  });
});
