import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfilUsuario } from '../../database/entities/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUserDto } from '../../modules/auth/dto/auth-response.dto';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<PerfilUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{
      user?: AuthUserDto;
    }>();
    if (!user || !roles.includes(user.perfil)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso.',
      );
    }

    return true;
  }
}
