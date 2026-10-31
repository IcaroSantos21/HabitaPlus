import { normalizarIdentificador } from './normalizar-identificador';

describe('normalizarIdentificador', () => {
  it('deve remover acentos, usar minúsculos e snake_case', () => {
    expect(normalizarIdentificador('  Salão de Festas ')).toBe(
      'salao_de_festas',
    );
    expect(normalizarIdentificador('ELEVADOR')).toBe('elevador');
  });

  it('deve devolver vazio quando não há letras nem números', () => {
    expect(normalizarIdentificador('!!! ---')).toBe('');
  });
});
