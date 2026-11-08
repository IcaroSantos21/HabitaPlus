import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import {
  ConversaInboxDto,
  MensagemResponseDto,
} from './dto/mensagem-response.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Rotas fixas antes da rota com :id.
  @Get('inbox')
  @ApiOperation({
    summary:
      'Lista as conversas do usuário com a última mensagem e as não lidas',
  })
  @ApiOkResponse({ type: [ConversaInboxDto] })
  inbox(@CurrentUser() usuario: AuthUserDto): Promise<ConversaInboxDto[]> {
    return this.messagesService.inbox(usuario);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca uma mensagem recebida como lida' })
  @ApiOkResponse({ type: MensagemResponseDto })
  @ApiNotFoundResponse({ description: 'Mensagem não encontrada' })
  marcarComoLida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<MensagemResponseDto> {
    return this.messagesService.marcarComoLida(id, usuario);
  }
}
