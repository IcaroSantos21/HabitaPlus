import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Encaminha a consulta ao serviço e retorna o status da API e do banco.
  @Get()
  @ApiOperation({ summary: 'Verifica se a API e o banco estão no ar' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  check(): Promise<HealthResponseDto> {
    return this.healthService.checkHealth();
  }
}
