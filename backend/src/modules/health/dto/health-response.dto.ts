import { ApiProperty } from '@nestjs/swagger';

// Descreve a resposta do endpoint que informa a disponibilidade da API e do banco.
export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ enum: ['up', 'down'] })
  database!: 'up' | 'down';
}
