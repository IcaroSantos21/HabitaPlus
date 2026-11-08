import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PerfilUsuario } from '../../database/entities/enums';
import {
  DashboardQueryDto,
  InadimplenciaQueryDto,
} from './dto/finance-query.dto';
import {
  DashboardResponseDto,
  InadimplenciaResponseDto,
} from './dto/finance-response.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@ApiForbiddenResponse({ description: 'Apenas síndico ou administrador' })
@Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('delinquency')
  @ApiOperation({
    summary:
      'Indicadores de inadimplência: total, percentual, por unidade e por mês',
  })
  @ApiOkResponse({ type: InadimplenciaResponseDto })
  @ApiBadRequestResponse({ description: 'Período inválido' })
  delinquency(
    @Query() query: InadimplenciaQueryDto,
  ): Promise<InadimplenciaResponseDto> {
    return this.financeService.inadimplencia(query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Resumo financeiro do mês para o painel' })
  @ApiOkResponse({ type: DashboardResponseDto })
  dashboard(@Query() query: DashboardQueryDto): Promise<DashboardResponseDto> {
    return this.financeService.dashboard(query);
  }
}
