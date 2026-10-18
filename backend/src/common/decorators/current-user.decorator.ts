import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserDto } from '../../modules/auth/dto/auth-response.dto';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUserDto =>
    context.switchToHttp().getRequest<{ user: AuthUserDto }>().user,
);
