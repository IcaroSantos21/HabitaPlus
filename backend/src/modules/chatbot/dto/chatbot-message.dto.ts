import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatbotMessageDto {
  @ApiProperty({ example: 'Quero saber os apartamentos disponíveis' })
  @IsString({ message: 'O texto da mensagem deve ser um texto.' })
  @IsNotEmpty({ message: 'O texto da mensagem é obrigatório.' })
  text!: string;
}
