import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
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
import { Roles } from '../../common/decorators/roles.decorator';
import { PerfilUsuario } from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { FiltrosNotificacaoDto } from './dto/filtros-notificacao.dto';
import {
  ContagemNaoLidasResponseDto,
  LeituraEmMassaResponseDto,
  NotificacaoResponseDto,
  NotificacoesPaginadasResponseDto,
} from './dto/notificacao-response.dto';
import { NotificationsDiariasService } from './notifications-diarias.service';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly dailyNotificationsService: NotificationsDiariasService,
  ) {}

  @Post('run-daily')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({
    summary: 'Executa a verificacao diaria de alertas do condominio',
  })
  @ApiForbiddenResponse({ description: 'Apenas síndico ou administrador' })
  @ApiCreatedResponse({ description: 'Verificacao de alertas concluida' })
  async executarAlertasDiarios(): Promise<{ message: string }> {
    await this.dailyNotificationsService.run();
    return { message: 'Verificacao de alertas concluida.' };
  }

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
