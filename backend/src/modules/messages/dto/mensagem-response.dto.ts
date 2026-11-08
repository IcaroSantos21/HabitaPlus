import { ApiProperty } from '@nestjs/swagger';
import { Mensagem } from '../../../database/entities/mensagem.entity';

export class MensagemResponseDto {
  @ApiProperty({ example: 100 })
  id!: number;

  @ApiProperty({ example: 5 })
  anuncioId!: number;

  @ApiProperty({ example: 7 })
  remetenteId!: number;

  @ApiProperty({ example: 1 })
  destinatarioId!: number;

  @ApiProperty({ example: 'Olá! O sofá ainda está disponível?' })
  texto!: string;

  @ApiProperty({ example: false })
  lida!: boolean;

  @ApiProperty({ example: '2026-11-08T12:00:00.000Z' })
  criadaEm!: string;

  // Exige as relações anuncio, remetente e destinatario carregadas (ao menos o id).
  static fromEntity(entity: Mensagem): MensagemResponseDto {
    return {
      id: entity.id,
      anuncioId: entity.anuncio.id,
      remetenteId: entity.remetente.id,
      destinatarioId: entity.destinatario.id,
      texto: entity.texto,
      lida: entity.lida,
      criadaEm: entity.criadaEm.toISOString(),
    };
  }
}

export class InboxUsuarioDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: 'Maria' })
  nome!: string;
}

export class InboxUltimaMensagemDto {
  @ApiProperty({ example: 100 })
  id!: number;

  @ApiProperty({ example: 'Olá! O sofá ainda está disponível?' })
  texto!: string;

  @ApiProperty({ example: 7 })
  remetenteId!: number;

  @ApiProperty({ example: '2026-11-08T12:00:00.000Z' })
  criadaEm!: string;
}

export class ConversaInboxDto {
  @ApiProperty({ example: 5 })
  anuncioId!: number;

  @ApiProperty({ example: 'Sofá 3 lugares' })
  anuncioTitulo!: string;

  @ApiProperty({
    type: InboxUsuarioDto,
    description: 'A outra pessoa da conversa',
  })
  outroUsuario!: InboxUsuarioDto;

  @ApiProperty({ type: InboxUltimaMensagemDto })
  ultimaMensagem!: InboxUltimaMensagemDto;

  @ApiProperty({
    example: 2,
    description: 'Mensagens recebidas por você e ainda não lidas',
  })
  naoLidas!: number;
}
