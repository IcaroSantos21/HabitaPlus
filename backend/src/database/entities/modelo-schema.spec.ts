import { getMetadataArgsStorage } from 'typeorm';
import { Chamado } from './chamado.entity';
import { Transacao } from './transacao.entity';
import { Visualizacao } from './visualizacao.entity';

describe('modelo do banco', () => {
  const metadata = getMetadataArgsStorage();

  it('armazena a data da transação como DATE', () => {
    const dataColumn = metadata.columns.find(
      (column) => column.target === Transacao && column.propertyName === 'data',
    );
    const legacyDadosColumn = metadata.columns.find(
      (column) =>
        column.target === Transacao && column.propertyName === 'dados',
    );

    expect(dataColumn?.options.type).toBe('date');
    expect(legacyDadosColumn).toBeUndefined();
  });

  it('armazena a data e hora da visualização como TIMESTAMP', () => {
    const dataColumn = metadata.columns.find(
      (column) =>
        column.target === Visualizacao && column.propertyName === 'data',
    );
    const legacyDadosColumn = metadata.columns.find(
      (column) =>
        column.target === Visualizacao && column.propertyName === 'dados',
    );

    expect(dataColumn?.options.type).toBe('timestamp');
    expect(legacyDadosColumn).toBeUndefined();
  });

  it('permite que um chamado não esteja vinculado a uma unidade', () => {
    const unitRelation = metadata.relations.find(
      (relation) =>
        relation.target === Chamado && relation.propertyName === 'unidade',
    );

    expect(unitRelation?.options?.nullable).toBe(true);
  });
});
