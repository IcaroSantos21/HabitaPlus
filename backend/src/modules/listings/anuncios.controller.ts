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

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUserDto } from '../auth/dto/auth-response.dto';

import { AnunciosService } from './anuncios.service';
import { CreateAnuncioDto } from './dto/create-anuncio.dto';
import { UpdateAnuncioDto } from './dto/update-anuncio.dto';
import { UpdateStatusAnuncioDto } from './dto/update-status-anuncio.dto';
import { FilterAnunciosDto } from './dto/filter-anuncios.dto';

@ApiTags('Marketplace')
@ApiBearerAuth()
@Controller('listings')
export class AnunciosController {
  constructor(private readonly anunciosService: AnunciosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um anúncio' })
  criar(@Body() dto: CreateAnuncioDto, @CurrentUser() usuario: AuthUserDto) {
    return this.anunciosService.criar(dto, usuario);
  }

  // As rotas estáticas devem vir antes da rota dinâmica /:id.

  @Get('categories')
  @ApiOperation({ summary: 'Listar as categorias disponíveis' })
  categorias() {
    return this.anunciosService.categorias();
  }

  @Get('mine')
  @ApiOperation({ summary: 'Listar os anúncios do usuário autenticado' })
  meusAnuncios(@CurrentUser() usuario: AuthUserDto) {
    return this.anunciosService.meusAnuncios(usuario);
  }

  @Get()
  @ApiOperation({ summary: 'Buscar e filtrar anúncios' })
  listar(@Query() filtros: FilterAnunciosDto) {
    return this.anunciosService.listar(filtros);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Registrar visualização de anúncio' })
  registrarVisualizacao(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthUserDto,
  ) {
    return this.anunciosService.registrarVisualizacao(id, usuario);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar os detalhes de um anúncio' })
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.anunciosService.buscarPorId(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar o status de um anúncio próprio' })
  atualizarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusAnuncioDto,
    @CurrentUser() usuario: AuthUserDto,
  ) {
    return this.anunciosService.atualizarStatus(id, dto, usuario);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar um anúncio próprio' })
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnuncioDto,
    @CurrentUser() usuario: AuthUserDto,
  ) {
    return this.anunciosService.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir um anúncio próprio' })
  remover(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: AuthUserDto,
  ) {
    return this.anunciosService.remover(id, usuario);
  }
}
