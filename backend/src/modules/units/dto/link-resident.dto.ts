import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { TipoVinculo } from '../../../database/entities/enums';

export class LinkResidentDto {
  @ApiProperty({ example: 12 })
  @IsInt({ message: 'O ID do usuário deve ser um número inteiro.' })
  @Min(1, { message: 'O ID do usuário deve ser maior que zero.' })
  usuarioId!: number;

  @ApiProperty({ enum: TipoVinculo, enumName: 'TipoVinculo' })
  @IsEnum(TipoVinculo, { message: 'Informe um tipo de vínculo válido.' })
  tipo!: TipoVinculo;
}
