import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  nome!: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail({}, { message: 'Informe um endereço de e-mail válido.' })
  email!: string;

  @ApiProperty({ example: 'senha-segura-123', minLength: 8 })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  senha!: string;
}
