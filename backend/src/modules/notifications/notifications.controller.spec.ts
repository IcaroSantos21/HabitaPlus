import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { FiltrosNotificacaoDto } from './dto/filtros-notificacao.dto';
import { NotificationsController } from './notifications.controller';
import { NotificationsDiariasService } from './notifications-diarias.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  const notificationsService = {
    listar: jest.fn(),
    contarNaoLidas: jest.fn(),
    marcarTodasComoLidas: jest.fn(),
    marcarComoLida: jest.fn(),
  };
  const dailyNotificationsService = { run: jest.fn() };
  let controller: NotificationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    dailyNotificationsService.run.mockResolvedValue(undefined);
    controller = new NotificationsController(
      notificationsService as unknown as NotificationsService,
      dailyNotificationsService as unknown as NotificationsDiariasService,
    );
  });

  it('executa a verificacao diaria de alertas sob demanda', async () => {
    await expect(controller.executarAlertasDiarios()).resolves.toEqual({
      message: 'Verificacao de alertas concluida.',
    });
    expect(dailyNotificationsService.run).toHaveBeenCalledTimes(1);
  });

  it('mantem as rotas de notificacao do usuario', async () => {
    const user = { id: 1 } as AuthUserDto;
    const filters = {} as FiltrosNotificacaoDto;
    notificationsService.listar.mockResolvedValue({ data: [] });

    await expect(controller.listar(filters, user)).resolves.toEqual({
      data: [],
    });
    expect(notificationsService.listar).toHaveBeenCalledWith(filters, user);
  });
});
