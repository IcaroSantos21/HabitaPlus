import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import { FiltrosChamadoDto } from './dto/filtros-chamado.dto';
import { HistoricoChamadoQueryDto } from './dto/historico-chamado-query.dto';
import {
  PaginatedTicketsResponseDto,
  ChamadoResponseDto,
} from './dto/chamado-response.dto';
import { EstatisticasChamadoResponseDto } from './dto/estatisticas-chamados-response.dto';
import { AtualizarStatusChamadoDto } from './dto/atualizar-status-chamado.dto';
import { ChamadosService } from './chamados.service';

const idPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException('O id do chamado deve ser um número inteiro.'),
});

@ApiTags('tickets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('tickets')
export class ChamadosController {
  constructor(private readonly chamadosService: ChamadosService) {}

  @Post()
  @ApiOperation({ summary: 'Abre um chamado (unidade OU área comum)' })
  @ApiCreatedResponse({ type: ChamadoResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiForbiddenResponse({ description: 'Sem vínculo com a unidade' })
  @ApiNotFoundResponse({ description: 'Unidade não encontrada' })
  create(
    @Body() input: CriarChamadoDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<ChamadoResponseDto> {
    return this.chamadosService.create(input, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista chamados (morador vê só os seus; síndico/admin veem todos)',
  })
  @ApiOkResponse({ type: PaginatedTicketsResponseDto })
  findAll(
    @Query() filtros: FiltrosChamadoDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<PaginatedTicketsResponseDto> {
    return this.chamadosService.buscaTodos(filtros, user);
  }

  @Get('history')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Histórico de chamados por equipamento e/ou área' })
  @ApiOkResponse({ type: PaginatedTicketsResponseDto })
  @ApiBadRequestResponse({ description: 'Nenhum filtro informado' })
  @ApiForbiddenResponse({ description: 'Apenas síndico ou admin' })
  findHistory(
    @Query() query: HistoricoChamadoQueryDto,
  ): Promise<PaginatedTicketsResponseDto> {
    return this.chamadosService.buscarHistorico(query);
  }

  @Get('stats')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Contagem de chamados por equipamento e por mês' })
  @ApiOkResponse({ type: EstatisticasChamadoResponseDto })
  @ApiForbiddenResponse({ description: 'Apenas síndico ou admin' })
  getStats(): Promise<EstatisticasChamadoResponseDto> {
    return this.chamadosService.getStatus();
  }

  @Patch(':id/status')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Avança o status do chamado' })
  @ApiOkResponse({ type: ChamadoResponseDto })
  @ApiBadRequestResponse({ description: 'Transição de status inválida' })
  @ApiForbiddenResponse({ description: 'Apenas síndico ou admin' })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado' })
  @ApiConflictResponse({ description: 'Chamado alterado por outra pessoa' })
  updateStatus(
    @Param('id', idPipe) id: number,
    @Body() input: AtualizarStatusChamadoDto,
  ): Promise<ChamadoResponseDto> {
    return this.chamadosService.atualizarStatus(id, input);
  }
}
