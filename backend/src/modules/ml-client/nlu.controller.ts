import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MlClientService } from './ml-client.service';
import { NluParseDto } from './dto/nlu-parse.dto';

@ApiTags('NLU')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Autenticação necessária' })
@Controller('nlu')
export class NluController {
  constructor(private readonly mlClientService: MlClientService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Interpreta texto e extrai intenção e entidades' })
  @ApiBody({ type: NluParseDto })
  parse(@Body() dto: NluParseDto) {
    return this.mlClientService.parse(dto.texto);
  }
}
