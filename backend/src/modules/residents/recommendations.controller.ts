import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { RecommendResponse } from '../ml-client/ml-client.service';
import { ResidentsService } from './residents.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Retorna recomendações do marketplace para o morador',
  })
  @ApiOkResponse({ description: 'Lista de recomendações personalizadas' })
  getMyRecommendations(
    @CurrentUser() usuario: AuthUserDto,
  ): Promise<RecommendResponse> {
    return this.residentsService.obterRecomendacoes(usuario);
  }
}
