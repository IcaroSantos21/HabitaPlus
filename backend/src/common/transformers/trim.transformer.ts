import { Transform } from 'class-transformer';

const trimValor = (valor: unknown): unknown => {
  return typeof valor === 'string' ? valor.trim() : valor;
};

// Remove espaços nas pontas para que "  " seja barrado
export const Trim = () =>
  Transform(({ value: valor }: { value: unknown }): unknown =>
    trimValor(valor),
  );

// Igual ao Trim, mas converte texto vazio em undefined (ex: "?equipamento=")
export const TrimOrUndefined = () =>
  Transform(({ value: valor }: { value: unknown }): unknown => {
    const trimmed = trimValor(valor);
    return trimmed === '' ? undefined : trimmed;
  });
