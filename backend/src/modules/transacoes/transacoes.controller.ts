import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import { AtualizarTransacaoDto } from './dto/atualizar-transacao.dto';
import { CriarTransacaoDto } from './dto/criar-transacao.dto';
import {
  ResumoMensalQueryDto,
  TransacaoQueryDto,
} from './dto/transacao-query.dto';
import {
  ResumoMensalResponseDto,
  TransacaoResponseDto,
} from './dto/transacao-response.dto';
import { TransacoesPaginadasResponseDto } from './dto/transacoes-paginadas-response.dto';
import { TransacoesService } from './transacoes.service';

const idPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException('O id da transação deve ser um número inteiro.'),
});

@ApiTags('transactions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@ApiForbiddenResponse({ description: 'Apenas síndico ou administrador' })
@Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
@Controller('transactions')
export class TransacoesController {
  constructor(private readonly transacoesService: TransacoesService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma transação financeira' })
  @ApiCreatedResponse({ type: TransacaoResponseDto })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou valor não positivo',
  })
  create(
    @Body() input: CriarTransacaoDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<TransacaoResponseDto> {
    return this.transacoesService.create(input, user.id);
  }

  @Get('monthly-summary')
  @ApiOperation({
    summary: 'Retorna receitas, despesas e saldo por competência',
  })
  @ApiOkResponse({ type: [ResumoMensalResponseDto] })
  @ApiBadRequestResponse({ description: 'Intervalo de competências inválido' })
  monthlySummary(
    @Query() query: ResumoMensalQueryDto,
  ): Promise<ResumoMensalResponseDto[]> {
    return this.transacoesService.monthlySummary(query);
  }

  @Get()
  @ApiOperation({ summary: 'Lista transações com filtros e paginação' })
  @ApiOkResponse({ type: TransacoesPaginadasResponseDto })
  findAll(
    @Query() query: TransacaoQueryDto,
  ): Promise<TransacoesPaginadasResponseDto> {
    return this.transacoesService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma transação financeira' })
  @ApiOkResponse({ type: TransacaoResponseDto })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou valor não positivo',
  })
  @ApiNotFoundResponse({ description: 'Transação não encontrada' })
  update(
    @Param('id', idPipe) id: number,
    @Body() input: AtualizarTransacaoDto,
  ): Promise<TransacaoResponseDto> {
    return this.transacoesService.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove uma transação financeira' })
  @ApiNoContentResponse({ description: 'Transação removida' })
  @ApiNotFoundResponse({ description: 'Transação não encontrada' })
  async remove(@Param('id', idPipe) id: number): Promise<void> {
    await this.transacoesService.remove(id);
  }
}
