import { SetMetadata } from '@nestjs/common';
import { PerfilUsuario } from '../../database/entities/enums';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: PerfilUsuario[]) =>
  SetMetadata(ROLES_KEY, roles);
