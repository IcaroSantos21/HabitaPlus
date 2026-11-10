import { readFileSync } from 'fs';
import path from 'path';
import { parseExpenseDataset } from './seed-demo';

describe('parseExpenseDataset', () => {
  it('normaliza as categorias do ML-02 para as categorias aceitas pelo backend', () => {
    expect(
      parseExpenseDataset(
        [
          'month,categoria,valor',
          '2025-01,agua,100.25',
          '2025-01,manutencao,200.5',
          '2025-01,salarios,300',
        ].join('\n'),
      ),
    ).toEqual([
      { month: '2025-01', category: 'água', amount: 100.25 },
      { month: '2025-01', category: 'manutenção', amount: 200.5 },
      { month: '2025-01', category: 'salários', amount: 300 },
    ]);
  });

  it('falha explicitamente se o arquivo nao tiver o formato ou dados esperados', () => {
    expect(() => parseExpenseDataset('month,total\n2025-01,100')).toThrow(
      'O dataset de despesas deve ter as colunas month,categoria,valor.',
    );
    expect(() =>
      parseExpenseDataset('month,categoria,valor\n2025-01,desconhecida,100'),
    ).toThrow('Linha 2 inválida no dataset de despesas.');
  });

  it('carrega pelo menos 12 meses completos do dataset versionado do ML-02', () => {
    const datasetPath = path.resolve(
      __dirname,
      '../../../ml-service/data/expenses.csv',
    );
    const rows = parseExpenseDataset(readFileSync(datasetPath, 'utf8'));

    expect(new Set(rows.map(({ month }) => month)).size).toBeGreaterThanOrEqual(
      12,
    );
    expect(rows.length).toBeGreaterThanOrEqual(60);
  });
});
