import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { Usuario } from '../../database/entities/usuario.entity';
import { PerfilUsuario } from '../../database/entities/enums';
import { AuthUserDto, LoginResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface JwtPayload {
  sub: number;
  email: string;
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError as unknown;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<AuthUserDto> {
    const usuario = this.usuariosRepository.create({
      nome: input.nome.trim(),
      email: input.email.trim().toLowerCase(),
      senhaHash: await bcrypt.hash(input.senha, this.saltRounds),
      perfil: PerfilUsuario.MORADOR,
    });

    try {
      return this.toAuthUser(await this.usuariosRepository.save(usuario));
    } catch (error) {
      if (error instanceof QueryFailedError && isUniqueViolation(error)) {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<LoginResponseDto> {
    const email = input.email.trim().toLowerCase();
    const usuario = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.senhaHash')
      .where('usuario.email = :email', { email })
      .getOne();

    if (!usuario || !(await bcrypt.compare(input.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const user = this.toAuthUser(usuario);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    } satisfies JwtPayload);

    return { accessToken, user };
  }

  toAuthUser(usuario: Usuario): AuthUserDto {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    };
  }
}
