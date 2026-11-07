import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
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
import { FiltrosNotificacaoDto } from './dto/filtros-notificacao.dto';
import {
  ContagemNaoLidasResponseDto,
  LeituraEmMassaResponseDto,
  NotificacaoResponseDto,
  NotificacoesPaginadasResponseDto,
} from './dto/notificacao-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as notificações do usuário logado' })
  @ApiOkResponse({ type: NotificacoesPaginadasResponseDto })
  listar(
    @Query() filtros: FiltrosNotificacaoDto,
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<NotificacoesPaginadasResponseDto> {
    return this.notificationsService.listar(filtros, usuario);
  }

  // Rotas fixas antes da rota com :id.
  @Get('unread-count')
  @ApiOperation({
    summary: 'Conta as notificações não lidas do usuário logado',
  })
  @ApiOkResponse({ type: ContagemNaoLidasResponseDto })
  contarNaoLidas(
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<ContagemNaoLidasResponseDto> {
    return this.notificationsService.contarNaoLidas(usuario);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas' })
  @ApiOkResponse({ type: LeituraEmMassaResponseDto })
  marcarTodasComoLidas(
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<LeituraEmMassaResponseDto> {
    return this.notificationsService.marcarTodasComoLidas(usuario);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  @ApiOkResponse({ type: NotificacaoResponseDto })
  @ApiNotFoundResponse({ description: 'Notificação não encontrada' })
  marcarComoLida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<NotificacaoResponseDto> {
    return this.notificationsService.marcarComoLida(id, usuario);
  }
}
