import { BadRequestException } from '@nestjs/common';
import { StatusChamado } from '../../../database/entities/enums';

// Cada status só pode avançar para o próximo: ENCERRADO é final
export const PROXIMO_STATUS: Readonly<
  Record<StatusChamado, StatusChamado | null>
> = {
  [StatusChamado.ABERTO]: StatusChamado.EM_ANDAMENTO,
  [StatusChamado.EM_ANDAMENTO]: StatusChamado.ENCERRADO,
  [StatusChamado.ENCERRADO]: null,
};

export const validarTransicaoDeStatus = (
  atual: StatusChamado,
  novo: StatusChamado,
): void => {
  const permitido = PROXIMO_STATUS[atual] ?? null;

  if (permitido === novo) return;

  if (permitido == null) {
    throw new BadRequestException(
      'O chamado já foi encerrado e não pode mais mudar de status',
    );
  }

  throw new BadRequestException(
    `Transição inválida: o chamado está ${atual} e só pode seguir para ${permitido}.`,
  );
};
