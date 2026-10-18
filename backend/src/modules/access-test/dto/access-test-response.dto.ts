import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from '../../auth/dto/auth-response.dto';

export class AccessTestResponseDto {
  @ApiProperty({ example: 'Acesso autorizado à área do síndico.' })
  message!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
