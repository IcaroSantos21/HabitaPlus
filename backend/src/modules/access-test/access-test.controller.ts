import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PerfilUsuario } from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { AccessTestResponseDto } from './dto/access-test-response.dto';

@ApiTags('testes de permissão')
@ApiBearerAuth()
@Controller('sindico')
export class SindicoAccessTestController {
  @Get()
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Testa o acesso de síndico ou administrador' })
  @ApiOkResponse({ type: AccessTestResponseDto })
  @ApiForbiddenResponse({
    description: 'Apenas síndicos e administradores podem acessar esta rota.',
  })
  checkAccess(@CurrentUser() user: AuthUserDto): AccessTestResponseDto {
    return {
      message: 'Acesso autorizado à área do síndico.',
      user,
    };
  }
}

@ApiTags('testes de permissão')
@ApiBearerAuth()
@Controller('admin')
export class AdminAccessTestController {
  @Get()
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Testa o acesso exclusivo de administrador' })
  @ApiOkResponse({ type: AccessTestResponseDto })
  @ApiForbiddenResponse({
    description: 'Apenas administradores podem acessar esta rota.',
  })
  checkAccess(@CurrentUser() user: AuthUserDto): AccessTestResponseDto {
    return {
      message: 'Acesso autorizado à área administrativa.',
      user,
    };
  }
}
