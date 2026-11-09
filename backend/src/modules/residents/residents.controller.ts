import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Utilize os mesmos caminhos de importação do seu anuncios.controller.ts
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { ResidentsService,  RecommendResponse} from './residents.service';

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get('me/interest-profile')
  @ApiOperation({
    summary: 'Consultar o perfil de interesse do morador',
  })
  obterPerfilDeInteresse(@CurrentUser() usuario: AuthUserDto) {
    return this.residentsService.obterPerfilDeInteresse(usuario);
  }

  @Get('me/recommendations')
  @ApiOperation({
    summary: 'Consultar anúncios recomendados para o morador',
  })
  obterRecomendacoes(
  @CurrentUser() usuario: AuthUserDto,
): Promise<RecommendResponse> {
  return this.residentsService.obterRecomendacoes(usuario);
  }
}
