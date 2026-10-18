import { ApiProperty } from '@nestjs/swagger';
import { PerfilUsuario } from '../../../database/entities/enums';

export class AuthUserDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nome!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: PerfilUsuario, enumName: 'PerfilUsuario' })
  perfil!: PerfilUsuario;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
