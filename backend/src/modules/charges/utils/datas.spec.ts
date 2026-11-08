import {
  dataDeHoje,
  adicionarDias,
  primeiroDiaDaCompetencia,
  vencimentoDaCompetencia,
} from './datas';

describe('utils de datas das cobranças', () => {
  describe('dataDeHoje (fuso de Brasília)', () => {
    it.each([
      ['meio-dia UTC', '2026-11-10T12:00:00Z', '2026-11-10'],
      [
        '23:59 em Brasília ainda é o mesmo dia',
        '2026-11-11T02:59:00Z',
        '2026-11-10',
      ],
      [
        '00:00 em Brasília já é o dia seguinte',
        '2026-11-11T03:00:00Z',
        '2026-11-11',
      ],
      ['virada de ano', '2027-01-01T02:00:00Z', '2026-12-31'],
      ['ano bissexto', '2028-03-01T03:00:00Z', '2028-03-01'],
    ])('%s', (_descricao, instante, esperado) => {
      expect(dataDeHoje(new Date(instante))).toBe(esperado);
    });
  });

  it('usa o primeiro dia do mês como competência', () => {
    expect(primeiroDiaDaCompetencia('2026-11')).toBe('2026-11-01');
  });

  it('adiciona dias civis sem depender do fuso do servidor', () => {
    expect(adicionarDias('2026-11-07', 30)).toBe('2026-12-07');
    expect(adicionarDias('2026-11-07', 3)).toBe('2026-11-10');
    expect(adicionarDias('2026-11-07', -89)).toBe('2026-08-10');
  });

  it('monta o vencimento com o dia configurado', () => {
    expect(vencimentoDaCompetencia('2026-11', 10)).toBe('2026-11-10');
    expect(vencimentoDaCompetencia('2026-02', 5)).toBe('2026-02-05');
    expect(vencimentoDaCompetencia('2026-02', 28)).toBe('2026-02-28');
  });
});
