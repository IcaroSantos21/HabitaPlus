import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUserDto, LoginResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registra um novo morador' })
  @ApiCreatedResponse({ type: AuthUserDto })
  register(@Body() input: RegisterDto): Promise<AuthUserDto> {
    return this.authService.register(input);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um usuário e retorna um token JWT' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'E-mail ou senha inválidos' })
  login(@Body() input: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(input);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuário autenticado' })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthUserDto): AuthUserDto {
    return user;
  }
}
