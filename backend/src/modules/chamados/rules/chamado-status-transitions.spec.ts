import { BadRequestException } from '@nestjs/common';
import { StatusChamado } from '../../../database/entities/enums';
import { validarTransicaoDeStatus } from './chamado-status-transitions';

const { ABERTO, EM_ANDAMENTO, ENCERRADO } = StatusChamado;

describe('validarTransicaoDeStatus', () => {
  it.each([
    [ABERTO, EM_ANDAMENTO],
    [EM_ANDAMENTO, ENCERRADO],
  ])('deve permitir avançar de %s para %s', (atual, novo) => {
    expect(() => validarTransicaoDeStatus(atual, novo)).not.toThrow();
  });

  it.each([
    [ABERTO, ENCERRADO],
    [ABERTO, ABERTO],
    [EM_ANDAMENTO, ABERTO],
    [EM_ANDAMENTO, EM_ANDAMENTO],
  ])('deve bloquear a transição de %s para %s', (atual, novo) => {
    expect(() => validarTransicaoDeStatus(atual, novo)).toThrow(
      BadRequestException,
    );
  });

  it.each([ABERTO, EM_ANDAMENTO, ENCERRADO])(
    'deve bloquear qualquer mudança a partir de encerrado (para %s)',
    (novo) => {
      expect(() => validarTransicaoDeStatus(ENCERRADO, novo)).toThrow(
        'O chamado já foi encerrado e não pode mais mudar de status',
      );
    },
  );

  it('deve informar o próximo status permitido na mensagem', () => {
    expect(() => validarTransicaoDeStatus(ABERTO, ENCERRADO)).toThrow(
      'Transição inválida: o chamado está ABERTO e só pode seguir para EM_ANDAMENTO.',
    );
  });
});
