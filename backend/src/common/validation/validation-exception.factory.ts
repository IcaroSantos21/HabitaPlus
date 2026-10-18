import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function createPortugueseValidationException(
  errors: ValidationError[],
): BadRequestException {
  const messages = errors.flatMap((error) =>
    Object.entries(error.constraints ?? {}).map(([constraint, message]) =>
      constraint === 'whitelistValidation'
        ? `O campo "${error.property}" não é permitido.`
        : message,
    ),
  );

  return new BadRequestException(
    messages.length > 0 ? messages : ['Os dados enviados são inválidos.'],
  );
}
