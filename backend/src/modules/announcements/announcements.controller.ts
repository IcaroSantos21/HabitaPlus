import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PerfilUsuario } from '../../database/entities/enums';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';
import { ListarComunicadosDto } from './dto/listar-comunicados.dto';
import { UpdateComunicadoDto } from './dto/update-comunicado.dto';
import { AnnouncementsService } from './announcements.service';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Criar comunicado e notificar os moradores' })
  criar(@Body() dto: CreateComunicadoDto) {
    return this.announcementsService.criar(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar comunicados, dos mais recentes aos antigos',
  })
  listar(@Query() query: ListarComunicadosDto) {
    return this.announcementsService.listar(query);
  }

  @Patch(':id')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Atualizar comunicado' })
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComunicadoDto,
  ) {
    return this.announcementsService.atualizar(id, dto);
  }

  @Delete(':id')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Excluir comunicado' })
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.announcementsService.remover(id);
  }
}
