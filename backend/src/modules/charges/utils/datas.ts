// O condomínio opera no horário de Brasília; o servidor pode rodar em UTC.
const FUSO_HORARIO = 'America/Sao_Paulo';

const formatadorDeData = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_HORARIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const FUSO_DO_CONDOMINIO = FUSO_HORARIO;

// Retorna o dia civil de Brasília no formato YYYY-MM-DD.
export function dataDeHoje(agora: Date): string {
  return formatadorDeData.format(agora);
}

export function adicionarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const resultado = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return resultado.toISOString().slice(0, 10);
}

// '2026-11' -> '2026-11-01' (a coluna `competencia` guarda o primeiro dia do mês).
export function primeiroDiaDaCompetencia(competencia: string): string {
  return `${competencia}-01`;
}

// '2026-11' + dia 10 -> '2026-11-10'. O dia é limitado a 1..28 na configuração.
export function vencimentoDaCompetencia(
  competencia: string,
  diaVencimento: number,
): string {
  return `${competencia}-${String(diaVencimento).padStart(2, '0')}`;
}
