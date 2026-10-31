import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PerfilUsuario } from '../../database/entities/enums';
import { CreateUnitDto } from './dto/create-unit.dto';
import { LinkResidentDto } from './dto/link-resident.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

@ApiTags('unidades')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiCreatedResponse({ description: 'Unidade criada.' })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Lista paginada de unidades.' })
  list(@Query() query: ListUnitsQueryDto) {
    return this.unitsService.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Unidade e moradores vinculados.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOkResponse({ description: 'Unidade atualizada.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Unidade removida.' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.unitsService.remove(id);
  }

  @Post(':id/residents')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiCreatedResponse({ description: 'Morador vinculado à unidade.' })
  linkResident(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkResidentDto,
  ) {
    return this.unitsService.linkResident(id, dto);
  }

  @Delete(':id/residents/:usuarioId')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Morador desvinculado da unidade.' })
  unlinkResident(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ): Promise<void> {
    return this.unitsService.unlinkResident(id, usuarioId);
  }
}
