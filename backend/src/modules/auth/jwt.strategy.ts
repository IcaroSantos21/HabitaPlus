import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthUserDto } from './dto/auth-response.dto';
import { AuthService } from './auth.service';

interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwtSecret', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUserDto | null> {
    const usuario = await this.usuariosRepository.findOneBy({
      id: payload.sub,
    });
    return usuario ? this.authService.toAuthUser(usuario) : null;
  }
}
