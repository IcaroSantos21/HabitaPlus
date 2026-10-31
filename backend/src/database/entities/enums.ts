// Lista os perfis de acesso que um usuário pode possuir no sistema.
export enum PerfilUsuario {
  MORADOR = 'MORADOR',
  SINDICO = 'SINDICO',
  ADMIN = 'ADMIN',
}

// Lista as formas de vínculo entre um usuário e uma unidade.
export enum TipoVinculo {
  PROPRIETARIO = 'PROPRIETARIO',
  INQUILINO = 'INQUILINO',
}

// Indica se uma transação registra entrada ou saída de dinheiro.
export enum TipoTransacao {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

// Lista os estados possíveis de uma cobrança.
export enum StatusCobranca {
  PENDENTE = 'PENDENTE',
  PAGA = 'PAGA',
  ATRASADA = 'ATRASADA',
}

// Lista os estados possíveis de um anúncio.
export enum StatusAnuncio {
  DISPONIVEL = 'DISPONIVEL',
  VENDIDO = 'VENDIDO',
}

// Lista os estados possíveis de um chamado.
export enum StatusChamado {
  ABERTO = 'ABERTO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  ENCERRADO = 'ENCERRADO',
}
