import { MlClientService } from './ml-client.service';
import { NluController } from './nlu.controller';

describe('NluController', () => {
  const mlClientService = {
    parse: jest.fn(),
  };
  let controller: NluController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NluController(
      mlClientService as unknown as MlClientService,
    );
  });

  it('encaminha o texto para o ML client e devolve a interpretação', async () => {
    const result = {
      intencao: 'CONSULTA_UNIDADES',
      confianca: 0.94,
      entities: { quartos: 2 },
    };
    mlClientService.parse.mockResolvedValue(result);

    await expect(
      controller.parse({ texto: 'Quero um apartamento de 2 quartos' }),
    ).resolves.toEqual(result);
    expect(mlClientService.parse).toHaveBeenCalledWith(
      'Quero um apartamento de 2 quartos',
    );
  });
});
