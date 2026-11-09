import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { ConversaQueryDto } from './dto/conversa-query.dto';
import { EnviarMensagemDto } from './dto/enviar-mensagem.dto';
import { MensagemResponseDto } from './dto/mensagem-response.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@ApiNotFoundResponse({ description: 'Anúncio não encontrado' })
@Controller('listings')
export class ListingMessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post(':id/messages')
  @ApiOperation({
    summary:
      'Envia mensagem no anúncio (comprador fala com o vendedor; o vendedor responde informando destinatarioId)',
  })
  @ApiCreatedResponse({ type: MensagemResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiForbiddenResponse({
    description: 'Você não pode enviar para esse destinatário',
  })
  enviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarMensagemDto,
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<MensagemResponseDto> {
    return this.messagesService.enviar(id, dto, usuario);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary:
      'Conversa do usuário logado no anúncio (o vendedor informa usuarioId do comprador)',
  })
  @ApiOkResponse({ type: [MensagemResponseDto] })
  @ApiBadRequestResponse({ description: 'O vendedor não informou o usuarioId' })
  @ApiForbiddenResponse({ description: 'Você não participa desta conversa' })
  conversa(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ConversaQueryDto,
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<MensagemResponseDto[]> {
    return this.messagesService.listarConversa(id, query, usuario);
  }
}
