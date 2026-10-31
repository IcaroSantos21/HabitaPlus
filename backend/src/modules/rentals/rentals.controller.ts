import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PerfilUsuario } from '../../database/entities/enums';
import { CreateRentalDto } from './dto/create-rental.dto';
import { EndRentalDto } from './dto/end-rental.dto';
import { ListRentalsQueryDto } from './dto/list-rentals-query.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { RentalsService } from './rentals.service';

@ApiTags('alugueis')
@ApiBearerAuth()
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get()
  @ApiOkResponse({ description: 'Lista contratos de locação.' })
  list(@Query() query: ListRentalsQueryDto) {
    return this.rentalsService.list(query);
  }

  @Post()
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOkResponse({ description: 'Contrato criado.' })
  create(@Body() dto: CreateRentalDto) {
    return this.rentalsService.create(dto);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Detalhes do contrato de locação.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rentalsService.findOne(id);
  }

  @Patch(':id')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOkResponse({ description: 'Contrato atualizado.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRentalDto) {
    return this.rentalsService.update(id, dto);
  }

  @Patch(':id/end')
  @Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)
  @ApiOkResponse({ description: 'Contrato encerrado.' })
  end(@Param('id', ParseIntPipe) id: number, @Body() dto: EndRentalDto) {
    return this.rentalsService.end(id, dto);
  }
}
