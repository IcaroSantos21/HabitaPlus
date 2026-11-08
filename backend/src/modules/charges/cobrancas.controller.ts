import { Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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

@ApiTags('charges')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('charges')
export class ChargesController {
  constructor(private readonly cobrancasService: CobrancasService) {}

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
}
