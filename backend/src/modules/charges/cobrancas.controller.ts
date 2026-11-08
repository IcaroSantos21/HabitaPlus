import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  ParseIntPipe,
  BadRequestException,
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
import { CobrancasService } from './cobrancas.service';
import { FiltrosCobrancaDto } from './dto/filtros-cobranca.dto';
import {
  GerarCobrancasResponseDto,
  CobrancasPaginadasResponseDto,
} from './dto/cobranca-response.dto';
import { GerarCobrancasQueryDto } from './dto/gerar-cobrancas-query.dto';
import { CobrancasCheckoutService } from './cobrancas-checkout.service';
import { CheckoutResponseDto } from './dto/checkout-response.dto';

const idPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException('O id da cobrança deve ser um número inteiro.'),
});

@ApiTags('charges')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('charges')
export class CobrancasController {
  constructor(
    private readonly cobrancasService: CobrancasService,
    private readonly cobrancasCheckoutService: CobrancasCheckoutService,
  ) {}

  @Post('generate')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({
    summary: 'Gera 1 cobrança por unidade ocupada na competência (idempotente)',
  })
  @ApiCreatedResponse({ type: GerarCobrancasResponseDto })
  @ApiBadRequestResponse({ description: 'Competência ausente ou inválida' })
  @ApiForbiddenResponse({ description: 'Apenas síndico ou administrador' })
  generate(
    @Query() query: GerarCobrancasQueryDto,
  ): Promise<GerarCobrancasResponseDto> {
    return this.cobrancasService.gerar(query.competencia);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista cobranças (síndico/admin: todas; morador: só as das suas unidades)',
  })
  @ApiOkResponse({ type: CobrancasPaginadasResponseDto })
  findAll(
    @Query() filtros: FiltrosCobrancaDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<CobrancasPaginadasResponseDto> {
    return this.cobrancasService.buscarTodas(filtros, user);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Lista as cobranças das unidades do usuário logado',
  })
  @ApiOkResponse({ type: CobrancasPaginadasResponseDto })
  findMine(
    @Query() filtros: FiltrosCobrancaDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<CobrancasPaginadasResponseDto> {
    return this.cobrancasService.buscarMinhas(filtros, user);
  }

  @Post(':id/checkout')
  @ApiOperation({
    summary: 'Cria uma sessão de checkout para pagamento da cobrança',
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiForbiddenResponse({ description: 'Cobrança de outra unidade' })
  @ApiNotFoundResponse({ description: 'Cobrança não encontrada' })
  @ApiConflictResponse({ description: 'Cobrança já paga' })
  checkout(
    @Param('id', idPipe) id: number,
    @CurrentUser() user: AuthUserDto,
  ): Promise<CheckoutResponseDto> {
    return this.cobrancasCheckoutService.criarCheckout(id, user);
  }
}
