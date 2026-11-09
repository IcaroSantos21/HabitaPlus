import { Controller, Get } from '@nestjs/common';
import {
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
  PredictExpensesResponse,
} from '../ml-client/ml-client.service';
import { PredictionsService } from './predictions.service';

@ApiTags('predictions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@ApiForbiddenResponse({ description: 'Apenas síndico ou administrador' })
@Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('expenses')
  @ApiOperation({
    summary: 'Prevê as despesas do próximo mês com base no histórico financeiro',
  })
  @ApiOkResponse({
    description: 'Previsão de despesas do próximo mês',
  })
  getExpensesForecast(): Promise<PredictExpensesResponse> {
    return this.predictionsService.getExpensesForecast();
  }
}
