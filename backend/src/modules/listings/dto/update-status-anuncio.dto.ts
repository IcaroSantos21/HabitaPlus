import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { StatusAnuncio } from '../../../database/entities/enums';

export class UpdateStatusAnuncioDto {
  @ApiProperty({ enum: StatusAnuncio })
  @IsEnum(StatusAnuncio)
  status!: StatusAnuncio;
}