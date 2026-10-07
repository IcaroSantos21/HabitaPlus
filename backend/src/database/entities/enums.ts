// Perfil que um usuário pode possuir no sistema.
export enum PerfilUsuario {
  MORADOR = 'MORADOR',
  SINDICO = 'SINDICO',
  ADMIN = 'ADMIN',
}

// Tipo de vínculo do usuário com uma unidade.
export enum TipoVinculo {
  PROPRIETARIO = 'PROPRIETARIO',
  INQUILINO = 'INQUILINO',
}

// Tipo de movimentação financeira.
export enum TipoTransacao {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

// Situação de uma cobrança.
export enum StatusCobranca {
  PENDENTE = 'PENDENTE',
  PAGA = 'PAGA',
  ATRASADA = 'ATRASADA',
}

// Situação de um anúncio.
export enum StatusAnuncio {
  DISPONIVEL = 'DISPONIVEL',
  VENDIDO = 'VENDIDO',
}