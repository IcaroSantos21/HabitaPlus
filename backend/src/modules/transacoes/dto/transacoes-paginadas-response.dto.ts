import { ApiProperty } from '@nestjs/swagger';
import { TransacaoResponseDto } from './transacao-response.dto';

export class TransacoesPaginadasResponseDto {
  @ApiProperty({ type: [TransacaoResponseDto] })
  data!: TransacaoResponseDto[];

  @ApiProperty({
    example: { pagina: 1, limite: 20, total: 1, totalPaginas: 1 },
  })
  meta!: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}
