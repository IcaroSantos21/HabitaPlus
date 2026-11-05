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
import { Cobrancas } from './cobrancas.service';
import { ChargeFiltersDto } from './dto/cobranca-filters.dto';
import {
  GenerateChargesResponseDto,
  PaginatedChargesResponseDto,
} from './dto/cobranca-response.dto';
import { GenerateChargesQueryDto } from './dto/gerar-cobranca-query.dto';

@ApiTags('charges')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('charges')
export class ChargesController {
  constructor(private readonly chargesService: Cobrancas) {}

  @Post('generate')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({
    summary: 'Gera 1 cobrança por unidade ocupada na competência (idempotente)',
  })
  @ApiCreatedResponse({ type: GenerateChargesResponseDto })
  @ApiBadRequestResponse({ description: 'Competência ausente ou inválida' })
  @ApiForbiddenResponse({ description: 'Apenas síndico ou administrador' })
  generate(
    @Query() query: GenerateChargesQueryDto,
  ): Promise<GenerateChargesResponseDto> {
    return this.chargesService.generate(query.competencia);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista cobranças (síndico/admin: todas; morador: só as das suas unidades)',
  })
  @ApiOkResponse({ type: PaginatedChargesResponseDto })
  findAll(
    @Query() filtros: ChargeFiltersDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<PaginatedChargesResponseDto> {
    return this.chargesService.findAll(filtros, user);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Lista as cobranças das unidades do usuário logado',
  })
  @ApiOkResponse({ type: PaginatedChargesResponseDto })
  findMine(
    @Query() filtros: ChargeFiltersDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<PaginatedChargesResponseDto> {
    return this.chargesService.findMine(filtros, user);
  }
}
