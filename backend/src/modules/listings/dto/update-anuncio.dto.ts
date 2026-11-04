import { PartialType } from '@nestjs/swagger';
import { CreateAnuncioDto } from './create-anuncio.dto';

export class UpdateAnuncioDto extends PartialType(CreateAnuncioDto) {}
